import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { env } from "@survey/env/server";

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
});
