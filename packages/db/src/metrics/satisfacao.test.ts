import { describe, expect, test } from "bun:test";

import { satisfacaoMedia, satisfacaoTaxa } from "./satisfacao";

describe("satisfacaoMedia", () => {
	test("média simples", () => {
		expect(satisfacaoMedia([4, 5, 3])).toBeCloseTo(4);
	});

	test("sem respostas retorna 0, não NaN", () => {
		expect(satisfacaoMedia([])).toBe(0);
	});
});

describe("satisfacaoTaxa", () => {
	test("mínimo da escala (1) vira 0", () => {
		expect(satisfacaoTaxa(1)).toBe(0);
	});

	test("máximo da escala (5) vira 1", () => {
		expect(satisfacaoTaxa(5)).toBe(1);
	});

	test("ponto médio (3) vira 0.5", () => {
		expect(satisfacaoTaxa(3)).toBeCloseTo(0.5);
	});
});
