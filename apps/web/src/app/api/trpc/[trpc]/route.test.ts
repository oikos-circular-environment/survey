import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { Context } from "@oikos-circular-environment/survey-api/context";
import { usabilityRateLimiter } from "@oikos-circular-environment/survey-api/lib/rate-limit";
import type { AppRouter } from "@oikos-circular-environment/survey-api/routers/index";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
	type UsabilityTestSetup,
} from "@oikos-circular-environment/survey-api/use-cases/usability-test-helpers";
import {
	createRepositories,
	type Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";
import { env } from "@survey/env/server";
import { createTRPCClient, httpBatchLink, httpLink } from "@trpc/client";
import { NextRequest } from "next/server";

/**
 * Integração HTTP da borda pública (S08/R3) — o único teste que passa pelo handler de
 * verdade (`app/api/trpc/[trpc]/route.ts`), e não pelo caller direto: `@trpc/client`
 * fala com os handlers `GET`/`POST` exportados pela `route.ts` via um `fetch` custom,
 * e o `createContext` é trocado por um amarrado ao banco efêmero (mesmo padrão de
 * `usability.test.ts`, mas do outro lado do fio HTTP).
 *
 * Cobrindo o que os testes de caller não enxergam: o status HTTP real (401/429), o
 * `Retry-After` composto em `responseMeta`, e a ausência de bloqueio/serialização entre
 * requisições concorrentes.
 */

/** Repositórios do banco efêmero, injetados no `createContext` mockado em `beforeAll`. */
let repositories: Repositories | undefined;

mock.module("@oikos-circular-environment/survey-api/context", () => ({
	createContext: async (req: NextRequest): Promise<Context> => ({
		auth: null,
		session: null,
		repositories: repositories as Repositories,
		headers: req.headers,
	}),
}));

const { GET, POST } = await import("./route");

/** Última `Response` crua produzida pelo handler, para inspecionar status e headers. */
let lastResponse: Response | undefined;

/**
 * IP dedicado por teste, para nenhum vazar contagem de rate limit para o outro.
 * `x-forwarded-for` é a fonte de `clientIpFrom` (`rate-limit.ts`) atrás de proxy.
 */
function routeFetch(ip: string) {
	return async (input: string | URL | Request, init?: RequestInit) => {
		const url =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.toString()
					: input.url;
		const headers = new Headers(init?.headers);
		headers.set("x-forwarded-for", ip);
		const req = new NextRequest(url, {
			...init,
			headers,
			signal: init?.signal ?? undefined,
		});
		const res = (init?.method ?? "GET") === "GET" ? GET(req) : POST(req);
		lastResponse = await res;
		return lastResponse;
	};
}

function clientFor(
	ip: string,
	headers: Record<string, string> = { "x-client-key": env.CLIENT_API_KEY },
) {
	return createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: "http://localhost/api/trpc",
				headers,
				fetch: routeFetch(ip),
			}),
		],
	});
}

/** Sem `httpBatchLink`: cada query vira uma requisição HTTP distinta. */
function unbatchedClientFor(ip: string) {
	return createTRPCClient<AppRouter>({
		links: [
			httpLink({
				url: "http://localhost/api/trpc",
				headers: { "x-client-key": env.CLIENT_API_KEY },
				fetch: routeFetch(ip),
			}),
		],
	});
}

describe("route HTTP — borda pública (S08/R3)", () => {
	let setup: UsabilityTestSetup;

	beforeAll(async () => {
		setup = await setupUsabilityTest();
		repositories = setup.repositories;
	});

	afterAll(async () => {
		await setup.ephemeral.destroy();
	});

	test("protocol com chave válida responde 200 com o protocolo ativo", async () => {
		const data = await clientFor("203.0.113.1").usability.protocol.query();

		expect(data?.key).toBe("oikos-walkthrough");
		expect(lastResponse?.status).toBe(200);
	});

	test("sem x-client-key responde 401 antes de tocar o banco", async () => {
		const client = clientFor("203.0.113.2", {});

		await expect(client.usability.protocol.query()).rejects.toMatchObject({
			data: { code: "UNAUTHORIZED" },
		});
		expect(lastResponse?.status).toBe(401);
	});

	test("com chave errada responde 401", async () => {
		const client = clientFor("203.0.113.3", {
			"x-client-key": "chave-errada",
		});

		await expect(client.usability.protocol.query()).rejects.toMatchObject({
			data: { code: "UNAUTHORIZED" },
		});
		expect(lastResponse?.status).toBe(401);
	});

	test("estourar o teto no mesmo IP responde 429 com Retry-After", async () => {
		const ip = "203.0.113.77";
		const now = Date.now();
		for (let i = 0; i < 1000; i++) {
			usabilityRateLimiter.check(ip, now);
		}
		const client = clientFor(ip);

		await expect(client.usability.protocol.query()).rejects.toMatchObject({
			data: { code: "TOO_MANY_REQUESTS" },
		});
		expect(lastResponse?.status).toBe(429);
		expect(lastResponse?.headers.get("retry-after")).toBe("60");
	});

	test("fluxo E1–E5 completo sobre HTTP", async () => {
		const client = clientFor("203.0.113.4");

		const session = buildSessionUpsertInput();
		const upserted = await client.usability.session.upsert.mutate(session);
		expect(upserted.session_id).toBe(session.session_id);

		const checkpoint = await client.usability.checkpoint.send.mutate({
			session_id: session.session_id,
			suite_run_id: randomUUID(),
			chunk: { index: 0, total: 1 },
			suite: {
				code: "S1",
				position: 0,
				started_at: new Date(),
				active_ms: 1_000,
				wall_ms: 1_000,
				outcome: "YES",
			},
			tasks: [],
			answers: [],
			events: [],
		});
		expect(checkpoint.suite_code).toBe("S1");

		const finished = await client.usability.finish.mutate({
			session_id: session.session_id,
			answers: [],
			active_ms: 1_000,
			wall_ms: 1_000,
			finished_at: new Date(),
		});
		expect(finished.status).toBe("COMPLETED");

		const other = buildSessionUpsertInput();
		await client.usability.session.upsert.mutate(other);
		const abandoned = await client.usability.abandon.mutate({
			session_id: other.session_id,
			active_ms: 1_000,
			wall_ms: 1_000,
			finished_at: new Date(),
		});
		expect(abandoned.status).toBe("ABANDONED");
	});

	test("requisições concorrentes não são serializadas nem bloqueadas", async () => {
		const client = unbatchedClientFor("203.0.113.9");

		const results = await Promise.all(
			Array.from({ length: 10 }, () => client.usability.protocol.query()),
		);

		for (const data of results) {
			expect(data?.key).toBe("oikos-walkthrough");
		}
	});
});
