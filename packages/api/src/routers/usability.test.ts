import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { protocol } from "@oikos-circular-environment/survey-db/protocol/data";
import { protocolVersions } from "@oikos-circular-environment/survey-db/schema/protocol";
import { env } from "@survey/env/server";
import { eq } from "drizzle-orm";

import type { Context } from "../context";
import { createCallerFactory } from "../index";
import { usabilityRateLimiter } from "../lib/rate-limit";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
	type UsabilityTestSetup,
} from "../use-cases/usability-test-helpers";
import { appRouter } from "./index";

const createCaller = createCallerFactory(appRouter);

let setup: UsabilityTestSetup;
let ipCounter = 0;

/** IP dedicado por teste, para nenhum vazar contagem de rate limit para o outro. */
function nextIp(): string {
	ipCounter += 1;
	return `10.77.0.${ipCounter}`;
}

function headersFor(ip: string, withKey = true): Headers {
	const headers = new Headers({ "x-forwarded-for": ip });
	if (withKey) headers.set("x-client-key", env.CLIENT_API_KEY);
	return headers;
}

function callerFor(headers: Headers) {
	const ctx: Context = {
		auth: null,
		session: null,
		repositories: setup.repositories,
		headers,
	};
	return createCaller(ctx);
}

describe("router usability — borda pública (S08)", () => {
	beforeAll(async () => {
		setup = await setupUsabilityTest();
	});

	afterAll(async () => {
		await setup.ephemeral.destroy();
	});

	test("requisição sem chave de cliente é recusada antes de qualquer acesso ao banco", async () => {
		const caller = callerFor(headersFor(nextIp(), false));
		const input = buildSessionUpsertInput();

		await expect(caller.usability.session.upsert(input)).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});

		const state = await setup.repositories.sessions.findStateById(
			input.session_id,
		);
		expect(state).toBeUndefined();
	});

	test("requisição com chave errada é recusada", async () => {
		const headers = headersFor(nextIp());
		headers.set("x-client-key", "chave-errada");

		await expect(callerFor(headers).usability.protocol()).rejects.toMatchObject(
			{
				code: "UNAUTHORIZED",
			},
		);
	});

	test("ultrapassar o teto (1000 req/s) no mesmo IP devolve TOO_MANY_REQUESTS", async () => {
		const ip = "10.77.99.99";
		const caller = callerFor(headersFor(ip));

		for (let i = 0; i < 1000; i++) {
			usabilityRateLimiter.check(ip);
		}

		await expect(caller.usability.protocol()).rejects.toMatchObject({
			code: "TOO_MANY_REQUESTS",
		});
	});

	test("checkpoint acima de 256 KB é recusado com PAYLOAD_TOO_LARGE, não uma falha genérica", async () => {
		const caller = callerFor(headersFor(nextIp()));
		const session = buildSessionUpsertInput();
		await caller.usability.session.upsert(session);

		const attempt = caller.usability.checkpoint.send({
			session_id: session.session_id,
			chunk: { index: 0, total: 1 },
			suite: {
				code: "S1",
				position: 0,
				started_at: new Date(),
				active_ms: 1_000,
				wall_ms: 1_000,
			},
			tasks: [],
			answers: [],
			events: [
				{
					client_event_id: randomUUID(),
					seq: 0,
					type: "api.call",
					occurred_at: new Date(),
					payload: { blob: "x".repeat(300_000) },
				},
			],
		});

		await expect(attempt).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
	});

	test("checkpoint para sessão inexistente devolve NOT_FOUND pela mesma forma de erro", async () => {
		const caller = callerFor(headersFor(nextIp()));

		const attempt = caller.usability.checkpoint.send({
			session_id: randomUUID(),
			chunk: { index: 0, total: 1 },
			suite: {
				code: "S1",
				position: 0,
				started_at: new Date(),
				active_ms: 0,
				wall_ms: 0,
			},
			tasks: [],
			answers: [],
			events: [],
		});

		await expect(attempt).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	test("corpo fora do contrato é recusado com BAD_REQUEST, mesma forma de erro das outras categorias", async () => {
		const caller = callerFor(headersFor(nextIp()));
		const input = buildSessionUpsertInput();

		const attempt = caller.usability.session.upsert({
			...input,
			screener: { ...input.screener, state_uf: "ZZ" },
			// biome-ignore lint/suspicious/noExplicitAny: propositalmente fora do contrato de tipo, para exercitar a validação em runtime.
		} as any);

		await expect(attempt).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("protocol/session.upsert/checkpoint.send/finish/abandon respondem com a chave correta", async () => {
		const caller = callerFor(headersFor(nextIp()));

		const protocolResponse = await caller.usability.protocol();
		if (!protocolResponse)
			throw new Error("protocolo deveria estar ativo por padrão");
		expect(protocolResponse.key).toBe("oikos-walkthrough");

		const session = buildSessionUpsertInput();
		const upserted = await caller.usability.session.upsert(session);
		expect(upserted.session_id).toBe(session.session_id);

		const checkpoint = await caller.usability.checkpoint.send({
			session_id: session.session_id,
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

		const finished = await caller.usability.finish({
			session_id: session.session_id,
			answers: [],
			active_ms: 1_000,
			wall_ms: 1_000,
			finished_at: new Date(),
		});
		expect(finished.status).toBe("COMPLETED");

		const otherSession = buildSessionUpsertInput();
		await caller.usability.session.upsert(otherSession);
		const abandoned = await caller.usability.abandon({
			session_id: otherSession.session_id,
			active_ms: 1_000,
			wall_ms: 1_000,
			finished_at: new Date(),
		});
		expect(abandoned.status).toBe("ABANDONED");
	});
});

describe("router usability — protocol() com versão inativa (S15)", () => {
	test("usability.protocol() devolve null quando nenhuma versão da key está ativa", async () => {
		const inactiveSetup = await setupUsabilityTest();
		try {
			await inactiveSetup.ephemeral.db
				.update(protocolVersions)
				.set({ isActive: false })
				.where(eq(protocolVersions.key, protocol.key));

			const ctx: Context = {
				auth: null,
				session: null,
				repositories: inactiveSetup.repositories,
				headers: headersFor(nextIp()),
			};
			const response = await createCaller(ctx).usability.protocol();

			expect(response).toBeNull();
		} finally {
			await inactiveSetup.ephemeral.destroy();
		}
	});
});
