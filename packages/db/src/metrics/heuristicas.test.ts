import { describe, expect, test } from "bun:test";

import { HEURISTICS, mediaLikert, prevencao } from "./heuristicas";

describe("HEURISTICS", () => {
	test("tem exatamente as 10 heurísticas de Nielsen", () => {
		expect(HEURISTICS).toHaveLength(10);
		expect(HEURISTICS.map((h) => h.id)).toEqual([
			"H1",
			"H2",
			"H3",
			"H4",
			"H5",
			"H6",
			"H7",
			"H8",
			"H9",
			"H10",
		]);
	});

	test("H7 e H10 são as únicas não medidas", () => {
		const unmeasured = HEURISTICS.filter((h) => !h.measured).map((h) => h.id);
		expect(unmeasured).toEqual(["H7", "H10"]);
	});

	test("heurísticas não medidas têm motivo não vazio", () => {
		for (const h of HEURISTICS) {
			if (!h.measured) expect(h.reason.length).toBeGreaterThan(0);
		}
	});
});

describe("mediaLikert", () => {
	test("média simples", () => {
		expect(mediaLikert([4, 5, 3, 4])).toBeCloseTo(4);
	});

	test("sem respostas retorna 0, não NaN", () => {
		expect(mediaLikert([])).toBe(0);
	});
});

describe("prevencao", () => {
	test("calcula a proporção de suítes sem erro", () => {
		const result = prevencao([
			"NO",
			"NO",
			"NO",
			"NO",
			"NO",
			"NO",
			"NO",
			"YES",
			"NO",
			"NO",
		]);
		expect(result).toEqual({ semErro: 9, total: 10, percentual: 0.9 });
	});

	test("todas as suítes com erro dá percentual 0", () => {
		expect(prevencao(["YES", "YES"]).percentual).toBe(0);
	});

	test("sem dados retorna percentual 0, não NaN", () => {
		expect(prevencao([]).percentual).toBe(0);
	});
});
