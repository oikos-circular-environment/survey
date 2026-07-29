import { describe, expect, test } from "bun:test";

import { eficiencia } from "./eficiencia";

describe("eficiencia", () => {
	test("tempo no meio do intervalo dá Tf perto de 0.5", () => {
		expect(eficiencia([5000], { min: 0, max: 10000 })).toBeCloseTo(0.5);
	});

	test("tempo no mínimo observado dá Tf alto", () => {
		expect(eficiencia([0], { min: 0, max: 10000 })).toBe(1);
	});

	test("sem execuções retorna 0, não NaN", () => {
		expect(eficiencia([], { min: 0, max: 10000 })).toBe(0);
	});

	test("min === max (sem variação observada) retorna 1", () => {
		expect(eficiencia([5000], { min: 5000, max: 5000 })).toBe(1);
	});

	test("resultado nunca sai de [0,1] mesmo quando a fórmula bruta passaria", () => {
		const result = eficiencia([9000], { min: 3000, max: 10000 });
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(1);
	});
});
