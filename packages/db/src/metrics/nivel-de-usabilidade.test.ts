import { describe, expect, test } from "bun:test";

import { classificar, nivelDeUsabilidade } from "./nivel-de-usabilidade";

describe("nivelDeUsabilidade", () => {
	test("média simples das três taxas", () => {
		expect(nivelDeUsabilidade({ te: 0.9, tf: 0.6, ts: 0.6 })).toBeCloseTo(0.7);
	});

	test("três taxas em 1 dá nível máximo", () => {
		expect(nivelDeUsabilidade({ te: 1, tf: 1, ts: 1 })).toBe(1);
	});

	test("três taxas em 0 dá nível mínimo", () => {
		expect(nivelDeUsabilidade({ te: 0, tf: 0, ts: 0 })).toBe(0);
	});
});

describe("classificar", () => {
	test("abaixo de 0.25 é Péssimo", () => {
		expect(classificar(0.1)).toBe("Péssimo");
	});

	test("0.25 já é Satisfatório (limite inferior inclusivo)", () => {
		expect(classificar(0.25)).toBe("Satisfatório");
	});

	test("0.5 já é Bom", () => {
		expect(classificar(0.5)).toBe("Bom");
	});

	test("0.75 já é Ótimo", () => {
		expect(classificar(0.75)).toBe("Ótimo");
	});

	test("1 é Ótimo", () => {
		expect(classificar(1)).toBe("Ótimo");
	});
});
