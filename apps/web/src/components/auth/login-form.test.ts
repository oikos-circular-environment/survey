import { describe, expect, test } from "bun:test";

import { safeRedirectTarget } from "./login-form";

/**
 * Metade cliente do S10 AC "cair na rota que se queria depois de entrar" — a metade
 * servidor (`proxy.ts` gravando `?redirect=`) é testada em `proxy.test.ts`. Junto, os
 * dois provam a ida e volta completa sem precisar de um navegador real.
 */
describe("safeRedirectTarget", () => {
	test("usa a rota preservada quando é um caminho relativo do próprio app", () => {
		expect(safeRedirectTarget("/dashboard/testers?page=2")).toBe(
			"/dashboard/testers?page=2",
		);
	});

	test("cai no painel quando não há rota preservada", () => {
		expect(safeRedirectTarget(undefined)).toBe("/dashboard");
	});

	test("recusa redirecionamento para outra origem (proteção contra open redirect)", () => {
		expect(safeRedirectTarget("//evil.example.com")).toBe("/dashboard");
		expect(safeRedirectTarget("https://evil.example.com")).toBe("/dashboard");
	});
});
