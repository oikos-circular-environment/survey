/**
 * Integra o validador de forma (`./validate.ts`) com os dados reais do instrumento
 * (`./data.ts`), e guarda contra regressão silenciosa nos dois pontos que motivaram a
 * reconciliação de tipos: a pergunta condicional `error_recovery` e o catálogo externo
 * de estado/cidade.
 */

import { describe, expect, test } from "bun:test";

import { protocol } from "./data";
import { validateProtocol } from "./validate";

describe("protocolo real", () => {
	test("passa no validador de forma", () => {
		expect(() => validateProtocol(protocol)).not.toThrow();
	});

	test("tem as 17 tarefas, 6 suítes e 5 personas do instrumento", () => {
		expect(protocol.tasks).toHaveLength(17);
		expect(protocol.suites).toHaveLength(6);
		expect(protocol.personas).toHaveLength(5);
	});

	test("error_recovery só aparece quando error_occurred é Sim", () => {
		const errorRecovery = protocol.questions.find(
			(q) => q.key === "error_recovery",
		);
		expect(errorRecovery?.depends_on).toEqual({
			question_key: "error_occurred",
			equals: "YES",
		});
	});

	test("estado e cidade vêm de catálogo externo, nunca de opções embutidas", () => {
		const state = protocol.questions.find((q) => q.key === "state");
		const city = protocol.questions.find((q) => q.key === "city");

		expect(state?.type).toBe("CHOICE");
		expect(city?.type).toBe("CHOICE");
		expect(
			state && "options_source" in state ? state.options_source : undefined,
		).toEqual({
			source: "STATES",
		});
		expect(
			city && "options_source" in city ? city.options_source : undefined,
		).toEqual({
			source: "CITIES",
			filtered_by: "state",
		});
	});
});
