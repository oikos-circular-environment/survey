import { describe, expect, test } from "bun:test";
import { env } from "@survey/env/server";

import type { Context } from "../context";
import { createCallerFactory } from "../index";
import { appRouter } from "./index";

const createCaller = createCallerFactory(appRouter);

/**
 * S08 estendido a toda procedure, sem exceção — inclusive `healthCheck`, que antes era
 * a única procedure sem nenhuma checagem.
 */
describe("healthCheck", () => {
	function callerFor(headers: Headers) {
		const ctx: Context = {
			auth: null,
			session: null,
			// nenhum resolver de healthCheck toca no banco — repositories nunca usado
			repositories: null as unknown as Context["repositories"],
			headers,
		};
		return createCaller(ctx);
	}

	test("sem chave de cliente: recusado", async () => {
		await expect(callerFor(new Headers()).healthCheck()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	test("com chave de cliente: responde OK", async () => {
		const headers = new Headers({ "x-client-key": env.CLIENT_API_KEY });
		await expect(callerFor(headers).healthCheck()).resolves.toBe("OK");
	});
});
