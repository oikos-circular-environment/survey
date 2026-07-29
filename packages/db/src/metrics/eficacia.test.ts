import { describe, expect, test } from "bun:test";

import { eficacia } from "./eficacia";

describe("eficacia", () => {
	test("conta só YES como sucesso", () => {
		expect(eficacia(["YES", "YES", "PARTIAL", "NO"])).toBeCloseTo(0.5);
	});

	test("PARTIAL não conta como sucesso parcial", () => {
		expect(eficacia(["PARTIAL", "PARTIAL"])).toBe(0);
	});

	test("sem execuções retorna 0, não NaN", () => {
		expect(eficacia([])).toBe(0);
	});

	test("100% de sucesso", () => {
		expect(eficacia(["YES", "YES"])).toBe(1);
	});
});
