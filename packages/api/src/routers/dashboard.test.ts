import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { protocolVersions } from "@oikos-circular-environment/survey-db/schema/protocol";
import { env } from "@survey/env/server";
import { eq } from "drizzle-orm";

import type { Context } from "../context";
import { createCallerFactory } from "../index";
import {
	createAdminSessionHeaders,
	type DashboardTestSetup,
	setupDashboardTest,
} from "./dashboard-test-helpers";
import { appRouter } from "./index";

const createCaller = createCallerFactory(appRouter);

let setup: DashboardTestSetup;

beforeAll(async () => {
	setup = await setupDashboardTest();
});

afterAll(async () => {
	await setup.ephemeral.destroy();
});

function callerFor(headers: Headers) {
	const ctx: Context = {
		auth: setup.auth,
		session: null,
		repositories: setup.repositories,
		headers,
	};
	return createCaller(ctx);
}

/**
 * S09/S10/A9: `dashboard.*` exige as duas camadas ao mesmo tempo — chave de cliente
 * (S08 estendido) e sessão de administrador do Better Auth. Nenhuma das duas substitui
 * a outra.
 */
describe("router dashboard — chave de cliente + sessão de admin (S09/S10/A9)", () => {
	test("chave de cliente válida e sessão de admin válida: acesso permitido", async () => {
		const sessionHeaders = await createAdminSessionHeaders(setup.auth);
		const headers = new Headers(sessionHeaders);
		headers.set("x-client-key", env.CLIENT_API_KEY);

		const result = await callerFor(headers).dashboard.overview({});
		expect(result.stats).toBeDefined();
	});

	test("chave de cliente válida, sem sessão nenhuma: recusado", async () => {
		const headers = new Headers({ "x-client-key": env.CLIENT_API_KEY });

		await expect(
			callerFor(headers).dashboard.overview({}),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("sessão de admin válida, sem chave de cliente: recusado", async () => {
		const sessionHeaders = await createAdminSessionHeaders(setup.auth);

		await expect(
			callerFor(new Headers(sessionHeaders)).dashboard.overview({}),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("sessão de admin válida, chave de cliente errada: recusado", async () => {
		const sessionHeaders = await createAdminSessionHeaders(setup.auth);
		const headers = new Headers(sessionHeaders);
		headers.set("x-client-key", "chave-errada");

		await expect(
			callerFor(headers).dashboard.overview({}),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("sem chave de cliente e sem sessão: recusado", async () => {
		await expect(
			callerFor(new Headers()).dashboard.overview({}),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("`protocol` também exige as duas camadas", async () => {
		await expect(
			callerFor(new Headers()).dashboard.protocol({}),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});
});

describe("router dashboard — protocol", () => {
	async function adminCaller() {
		const sessionHeaders = await createAdminSessionHeaders(setup.auth);
		const headers = new Headers(sessionHeaders);
		headers.set("x-client-key", env.CLIENT_API_KEY);
		return callerFor(headers);
	}

	test("sem versão explícita cai na ativa", async () => {
		const caller = await adminCaller();

		const response = await caller.dashboard.protocol({});

		expect(response?.suites.length).toBeGreaterThan(0);
		expect(response?.questions.length).toBeGreaterThan(0);
	});

	test("com versão explícita devolve aquela versão", async () => {
		const caller = await adminCaller();
		const [version] = await caller.dashboard.protocolVersions.list();
		if (!version) throw new Error("versão semeada deveria existir");

		const response = await caller.dashboard.protocol({
			protocolVersionId: version.id,
		});

		expect(response?.version).toBe(version.version);
		expect(response?.key).toBe(version.key);
	});
});

describe("router dashboard — protocolVersions.list/setActive (S15)", () => {
	async function adminCaller() {
		const sessionHeaders = await createAdminSessionHeaders(setup.auth);
		const headers = new Headers(sessionHeaders);
		headers.set("x-client-key", env.CLIENT_API_KEY);
		return callerFor(headers);
	}

	test("list traz a versão semeada como ativa", async () => {
		const caller = await adminCaller();

		const versions = await caller.dashboard.protocolVersions.list();

		expect(versions.length).toBeGreaterThan(0);
		expect(versions.every((version) => version.isActive)).toBe(true);
	});

	test("setActive(true) numa versão desativa as irmãs da mesma key", async () => {
		const caller = await adminCaller();
		const versions = await caller.dashboard.protocolVersions.list();
		const original = versions[0];
		if (!original) throw new Error("esperava ao menos uma versão semeada");

		const siblingId = randomUUID();
		await setup.ephemeral.db.insert(protocolVersions).values({
			id: siblingId,
			key: original.key,
			version: original.version + 1,
			isActive: false,
		});

		try {
			await caller.dashboard.protocolVersions.setActive({
				id: siblingId,
				isActive: true,
			});

			const afterActivatingSibling =
				await caller.dashboard.protocolVersions.list();
			expect(
				afterActivatingSibling.find((v) => v.id === siblingId)?.isActive,
			).toBe(true);
			expect(
				afterActivatingSibling.find((v) => v.id === original.id)?.isActive,
			).toBe(false);
		} finally {
			// Restaura o estado original para não vazar para os outros testes do arquivo.
			await caller.dashboard.protocolVersions.setActive({
				id: original.id,
				isActive: true,
			});
			await setup.ephemeral.db
				.delete(protocolVersions)
				.where(eq(protocolVersions.id, siblingId));
		}
	});
});
