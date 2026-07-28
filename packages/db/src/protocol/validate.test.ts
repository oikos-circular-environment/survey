/**
 * Um teste por código de problema que o validador pode reportar, cada um com a menor
 * fabricação de protocolo que o dispara — não os 17 dados reais, que ficam em
 * `data.test.ts`.
 */

import { describe, expect, test } from "bun:test";

import type { Protocol, Question, SuiteCode, TaskCode } from "./types";
import {
	collectProtocolIssues,
	ProtocolValidationError,
	validateProtocol,
} from "./validate";

function codesOf(protocol: Protocol): string[] {
	return collectProtocolIssues(protocol).map((issue) => issue.code);
}

/** Protocolo mínimo válido: uma tarefa, uma suíte, uma persona, quatro perguntas. */
function minimalProtocol(): Protocol {
	return {
		key: "test-protocol",
		version: 1,
		tasks: [
			{
				code: "T1",
				title: "Tarefa 1",
				instruction: "Faça a coisa.",
				success: { mode: "any", signals: [{ kind: "screen", route: "/x" }] },
			},
		],
		suites: [
			{
				code: "S1",
				title: "Suíte 1",
				objective: "Objetivo.",
				task_codes: ["T1"],
			},
		],
		personas: [
			{
				key: "CITIZEN",
				label: "Cidadão",
				description: "Descrição.",
				suite_codes: ["S1"],
			},
		],
		questions: [
			{
				key: "picked",
				scope: "SCREENER",
				position: 0,
				type: "CHOICE",
				required: true,
				label: "Escolha uma opção",
				options: [
					{ value: 1, key: "A", label: "Opção A" },
					{ value: 2, key: "B", label: "Opção B" },
				],
			},
			{
				key: "state",
				scope: "SCREENER",
				position: 1,
				type: "CHOICE",
				required: true,
				label: "Estado",
				options_source: { source: "STATES" },
			},
			{
				key: "city",
				scope: "SCREENER",
				position: 2,
				type: "CHOICE",
				required: true,
				label: "Cidade",
				options_source: { source: "CITIES", filtered_by: "state" },
			},
			{
				key: "dependent",
				scope: "SCREENER",
				position: 3,
				type: "SCALE",
				required: true,
				label: "Pergunta dependente",
				options: [
					{ value: 1, key: "LOW", label: "Baixo" },
					{ value: 2, key: "HIGH", label: "Alto" },
				],
				depends_on: { question_key: "picked", equals: "A" },
			},
		] satisfies Question[],
	};
}

describe("collectProtocolIssues — protocolo mínimo válido", () => {
	test("não reporta nenhum problema", () => {
		expect(collectProtocolIssues(minimalProtocol())).toEqual([]);
	});
});

describe("collectProtocolIssues — códigos repetidos", () => {
	test("DUPLICATE_TASK_CODE", () => {
		const protocol = minimalProtocol();
		protocol.tasks.push({ ...protocol.tasks[0]! });
		expect(codesOf(protocol)).toContain("DUPLICATE_TASK_CODE");
	});

	test("DUPLICATE_SUITE_CODE", () => {
		const protocol = minimalProtocol();
		protocol.suites.push({ ...protocol.suites[0]!, task_codes: [] });
		expect(codesOf(protocol)).toContain("DUPLICATE_SUITE_CODE");
	});

	test("DUPLICATE_PERSONA_KEY", () => {
		const protocol = minimalProtocol();
		protocol.personas.push({ ...protocol.personas[0]! });
		expect(codesOf(protocol)).toContain("DUPLICATE_PERSONA_KEY");
	});

	test("DUPLICATE_QUESTION_KEY", () => {
		const protocol = minimalProtocol();
		protocol.questions.push({ ...protocol.questions[0]! } as Question);
		expect(codesOf(protocol)).toContain("DUPLICATE_QUESTION_KEY");
	});
});

describe("collectProtocolIssues — referências suíte/tarefa e persona/suíte", () => {
	test("SUITE_TASK_CODE_UNDEFINED", () => {
		const protocol = minimalProtocol();
		protocol.suites[0]!.task_codes = ["T99" as unknown as TaskCode];
		expect(codesOf(protocol)).toContain("SUITE_TASK_CODE_UNDEFINED");
	});

	test("DUPLICATE_TASK_CODE_IN_SUITE", () => {
		const protocol = minimalProtocol();
		protocol.suites[0]!.task_codes = ["T1", "T1"];
		expect(codesOf(protocol)).toContain("DUPLICATE_TASK_CODE_IN_SUITE");
	});

	test("PERSONA_SUITE_CODE_UNDEFINED", () => {
		const protocol = minimalProtocol();
		protocol.personas[0]!.suite_codes = ["S99" as unknown as SuiteCode];
		expect(codesOf(protocol)).toContain("PERSONA_SUITE_CODE_UNDEFINED");
	});

	test("DUPLICATE_SUITE_CODE_IN_PERSONA", () => {
		const protocol = minimalProtocol();
		protocol.personas[0]!.suite_codes = ["S1", "S1"];
		expect(codesOf(protocol)).toContain("DUPLICATE_SUITE_CODE_IN_PERSONA");
	});
});

describe("collectProtocolIssues — forma das opções", () => {
	test("CHOICE_OPTIONS_XOR_VIOLATION — nenhum dos dois", () => {
		const protocol = minimalProtocol();
		const question = protocol.questions[0]! as Question & { type: "CHOICE" };
		delete question.options;
		expect(codesOf(protocol)).toContain("CHOICE_OPTIONS_XOR_VIOLATION");
	});

	test("CHOICE_OPTIONS_XOR_VIOLATION — os dois ao mesmo tempo", () => {
		const protocol = minimalProtocol();
		const question = protocol.questions[0]! as Question & {
			type: "CHOICE";
			options_source?: unknown;
		};
		question.options_source = { source: "STATES" };
		expect(codesOf(protocol)).toContain("CHOICE_OPTIONS_XOR_VIOLATION");
	});

	test("OPTIONS_EMPTY", () => {
		const protocol = minimalProtocol();
		const question = protocol.questions[0]! as Question & {
			type: "CHOICE";
			options: unknown[];
		};
		question.options = [];
		expect(codesOf(protocol)).toContain("OPTIONS_EMPTY");
	});

	test("OPTION_LABEL_BLANK", () => {
		const protocol = minimalProtocol();
		const question = protocol.questions[0]! as Question & {
			type: "CHOICE";
			options: { value: number; key: string; label: string }[];
		};
		question.options[0]!.label = "   ";
		expect(codesOf(protocol)).toContain("OPTION_LABEL_BLANK");
	});

	test("OPTION_KEY_BLANK", () => {
		const protocol = minimalProtocol();
		const question = protocol.questions[0]! as Question & {
			type: "CHOICE";
			options: { value: number; key: string; label: string }[];
		};
		question.options[0]!.key = "";
		expect(codesOf(protocol)).toContain("OPTION_KEY_BLANK");
	});

	test("DUPLICATE_OPTION_KEY_IN_QUESTION", () => {
		const protocol = minimalProtocol();
		const question = protocol.questions[0]! as Question & {
			type: "CHOICE";
			options: { value: number; key: string; label: string }[];
		};
		question.options[1]!.key = question.options[0]!.key;
		expect(codesOf(protocol)).toContain("DUPLICATE_OPTION_KEY_IN_QUESTION");
	});

	test("DUPLICATE_OPTION_VALUE_IN_QUESTION", () => {
		const protocol = minimalProtocol();
		const question = protocol.questions[0]! as Question & {
			type: "CHOICE";
			options: { value: number; key: string; label: string }[];
		};
		question.options[1]!.value = question.options[0]!.value;
		expect(codesOf(protocol)).toContain("DUPLICATE_OPTION_VALUE_IN_QUESTION");
	});
});

describe("collectProtocolIssues — options_source.filtered_by", () => {
	test("OPTIONS_SOURCE_FILTERED_BY_UNDEFINED", () => {
		const protocol = minimalProtocol();
		const city = protocol.questions.find(
			(q) => q.key === "city",
		)! as Question & {
			options_source: { filtered_by?: string };
		};
		city.options_source.filtered_by = "nao-existe";
		expect(codesOf(protocol)).toContain("OPTIONS_SOURCE_FILTERED_BY_UNDEFINED");
	});

	test("OPTIONS_SOURCE_FILTERED_BY_SCOPE_MISMATCH", () => {
		const protocol = minimalProtocol();
		const picked = protocol.questions.find((q) => q.key === "picked")!;
		picked.scope = "PER_SUITE";
		const city = protocol.questions.find(
			(q) => q.key === "city",
		)! as Question & {
			options_source: { filtered_by?: string };
		};
		city.options_source.filtered_by = "picked";
		expect(codesOf(protocol)).toContain(
			"OPTIONS_SOURCE_FILTERED_BY_SCOPE_MISMATCH",
		);
	});

	test("OPTIONS_SOURCE_FILTERED_BY_NOT_CATALOG", () => {
		const protocol = minimalProtocol();
		const city = protocol.questions.find(
			(q) => q.key === "city",
		)! as Question & {
			options_source: { filtered_by?: string };
		};
		city.options_source.filtered_by = "picked"; // "picked" tem options inline, não catálogo
		expect(codesOf(protocol)).toContain(
			"OPTIONS_SOURCE_FILTERED_BY_NOT_CATALOG",
		);
	});
});

describe("collectProtocolIssues — depends_on", () => {
	test("DEPENDS_ON_QUESTION_UNDEFINED", () => {
		const protocol = minimalProtocol();
		const dependent = protocol.questions.find((q) => q.key === "dependent")!;
		dependent.depends_on = { question_key: "nao-existe", equals: "A" };
		expect(codesOf(protocol)).toContain("DEPENDS_ON_QUESTION_UNDEFINED");
	});

	test("DEPENDS_ON_SCOPE_MISMATCH", () => {
		const protocol = minimalProtocol();
		const picked = protocol.questions.find((q) => q.key === "picked")!;
		picked.scope = "PER_SUITE";
		expect(codesOf(protocol)).toContain("DEPENDS_ON_SCOPE_MISMATCH");
	});

	test("DEPENDS_ON_VALUE_NOT_IN_OPTIONS", () => {
		const protocol = minimalProtocol();
		const dependent = protocol.questions.find((q) => q.key === "dependent")!;
		dependent.depends_on = { question_key: "picked", equals: "C" };
		expect(codesOf(protocol)).toContain("DEPENDS_ON_VALUE_NOT_IN_OPTIONS");
	});

	test("DEPENDS_ON_CONTROLLER_HAS_NO_INLINE_OPTIONS", () => {
		const protocol = minimalProtocol();
		const dependent = protocol.questions.find((q) => q.key === "dependent")!;
		dependent.depends_on = { question_key: "state", equals: "SP" };
		expect(codesOf(protocol)).toContain(
			"DEPENDS_ON_CONTROLLER_HAS_NO_INLINE_OPTIONS",
		);
	});

	test("DEPENDS_ON_CYCLE", () => {
		const protocol = minimalProtocol();
		const picked = protocol.questions.find(
			(q) => q.key === "picked",
		)! as Question & {
			depends_on?: { question_key: string; equals: string };
		};
		// "picked" passa a depender de "dependent", que já depende de "picked" — ciclo.
		picked.depends_on = { question_key: "dependent", equals: "LOW" };
		expect(codesOf(protocol)).toContain("DEPENDS_ON_CYCLE");
	});
});

describe("validateProtocol", () => {
	test("não lança para um protocolo válido", () => {
		expect(() => validateProtocol(minimalProtocol())).not.toThrow();
	});

	test("lança ProtocolValidationError agregando todos os problemas de uma vez", () => {
		const protocol = minimalProtocol();
		protocol.tasks.push({ ...protocol.tasks[0]! });
		protocol.suites.push({ ...protocol.suites[0]!, task_codes: [] });

		try {
			validateProtocol(protocol);
			throw new Error("esperava que validateProtocol lançasse");
		} catch (error) {
			expect(error).toBeInstanceOf(ProtocolValidationError);
			const issues = (error as ProtocolValidationError).issues;
			expect(issues.map((i) => i.code)).toEqual(
				expect.arrayContaining(["DUPLICATE_TASK_CODE", "DUPLICATE_SUITE_CODE"]),
			);
			expect(issues.length).toBeGreaterThanOrEqual(2);
		}
	});
});
