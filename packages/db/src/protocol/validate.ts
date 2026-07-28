/**
 * Validador de forma do protocolo.
 *
 * Roda antes do seed (`../seed/seed.ts`) e na integração contínua, para que um protocolo
 * mal formado quebre o pull request em vez de virar dado sujo em produção. Agrega todos
 * os problemas encontrados em vez de parar no primeiro — numa CI, ver os três problemas de
 * uma vez economiza três rodadas de push.
 */

import type { Option, Protocol, Question, SuiteCode, TaskCode } from "./types";

export interface ProtocolIssue {
	code: string;
	message: string;
}

export class ProtocolValidationError extends Error {
	readonly issues: ProtocolIssue[];

	constructor(issues: ProtocolIssue[]) {
		super(
			`Protocolo inválido (${issues.length} problema${issues.length === 1 ? "" : "s"}):\n` +
				issues.map((issue) => `  [${issue.code}] ${issue.message}`).join("\n"),
		);
		this.name = "ProtocolValidationError";
		this.issues = issues;
	}
}

function findDuplicates<T>(items: T[]): T[] {
	const seen = new Set<T>();
	const duplicates = new Set<T>();
	for (const item of items) {
		if (seen.has(item)) duplicates.add(item);
		seen.add(item);
	}
	return [...duplicates];
}

function optionsOf(question: Question): Option[] | undefined {
	return "options" in question ? question.options : undefined;
}

function checkDuplicateCodes(protocol: Protocol): ProtocolIssue[] {
	const issues: ProtocolIssue[] = [];

	for (const code of findDuplicates(protocol.tasks.map((t) => t.code))) {
		issues.push({
			code: "DUPLICATE_TASK_CODE",
			message: `Código de tarefa repetido: ${code}`,
		});
	}
	for (const code of findDuplicates(protocol.suites.map((s) => s.code))) {
		issues.push({
			code: "DUPLICATE_SUITE_CODE",
			message: `Código de suíte repetido: ${code}`,
		});
	}
	for (const key of findDuplicates(protocol.personas.map((p) => p.key))) {
		issues.push({
			code: "DUPLICATE_PERSONA_KEY",
			message: `Persona repetida: ${key}`,
		});
	}
	for (const key of findDuplicates(protocol.questions.map((q) => q.key))) {
		issues.push({
			code: "DUPLICATE_QUESTION_KEY",
			message: `Chave de pergunta repetida: ${key}`,
		});
	}

	return issues;
}

function checkSuiteTaskReferences(protocol: Protocol): ProtocolIssue[] {
	const issues: ProtocolIssue[] = [];
	const taskCodes = new Set<TaskCode>(protocol.tasks.map((t) => t.code));

	for (const suite of protocol.suites) {
		for (const code of findDuplicates(suite.task_codes)) {
			issues.push({
				code: "DUPLICATE_TASK_CODE_IN_SUITE",
				message: `Suíte ${suite.code} referencia a tarefa ${code} mais de uma vez`,
			});
		}
		for (const code of suite.task_codes) {
			if (!taskCodes.has(code)) {
				issues.push({
					code: "SUITE_TASK_CODE_UNDEFINED",
					message: `Suíte ${suite.code} referencia código de tarefa inexistente: ${code}`,
				});
			}
		}
	}

	return issues;
}

function checkPersonaSuiteReferences(protocol: Protocol): ProtocolIssue[] {
	const issues: ProtocolIssue[] = [];
	const suiteCodes = new Set<SuiteCode>(protocol.suites.map((s) => s.code));

	for (const persona of protocol.personas) {
		for (const code of findDuplicates(persona.suite_codes)) {
			issues.push({
				code: "DUPLICATE_SUITE_CODE_IN_PERSONA",
				message: `Persona ${persona.key} referencia a suíte ${code} mais de uma vez`,
			});
		}
		for (const code of persona.suite_codes) {
			if (!suiteCodes.has(code)) {
				issues.push({
					code: "PERSONA_SUITE_CODE_UNDEFINED",
					message: `Persona ${persona.key} referencia código de suíte inexistente: ${code}`,
				});
			}
		}
	}

	return issues;
}

function checkOptionsShape(protocol: Protocol): ProtocolIssue[] {
	const issues: ProtocolIssue[] = [];

	for (const question of protocol.questions) {
		if (question.type === "CHOICE") {
			const hasOptions =
				"options" in question && question.options !== undefined;
			const hasOptionsSource =
				"options_source" in question && question.options_source !== undefined;
			if (hasOptions === hasOptionsSource) {
				issues.push({
					code: "CHOICE_OPTIONS_XOR_VIOLATION",
					message: `Pergunta "${question.key}" precisa ter exatamente um de options/options_source`,
				});
			}
		}

		const options = optionsOf(question);
		if (options === undefined) continue;

		if (options.length === 0) {
			issues.push({
				code: "OPTIONS_EMPTY",
				message: `Pergunta "${question.key}" tem lista de opções vazia`,
			});
			continue;
		}

		for (const option of options) {
			if (!option.label.trim()) {
				issues.push({
					code: "OPTION_LABEL_BLANK",
					message: `Pergunta "${question.key}" tem opção com rótulo em branco (value=${option.value})`,
				});
			}
			if (!option.key.trim()) {
				issues.push({
					code: "OPTION_KEY_BLANK",
					message: `Pergunta "${question.key}" tem opção com key em branco (value=${option.value})`,
				});
			}
		}

		for (const key of findDuplicates(options.map((o) => o.key))) {
			issues.push({
				code: "DUPLICATE_OPTION_KEY_IN_QUESTION",
				message: `Pergunta "${question.key}" tem key de opção repetida: ${key}`,
			});
		}
		for (const value of findDuplicates(options.map((o) => o.value))) {
			issues.push({
				code: "DUPLICATE_OPTION_VALUE_IN_QUESTION",
				message: `Pergunta "${question.key}" tem value de opção repetido: ${value}`,
			});
		}
	}

	return issues;
}

function checkOptionsSourceFilters(protocol: Protocol): ProtocolIssue[] {
	const issues: ProtocolIssue[] = [];
	const questionsByKey = new Map(protocol.questions.map((q) => [q.key, q]));

	for (const question of protocol.questions) {
		if (
			question.type !== "CHOICE" ||
			!("options_source" in question) ||
			!question.options_source
		) {
			continue;
		}
		const filteredBy = question.options_source.filtered_by;
		if (filteredBy === undefined) continue;

		const controller = questionsByKey.get(filteredBy);
		if (!controller) {
			issues.push({
				code: "OPTIONS_SOURCE_FILTERED_BY_UNDEFINED",
				message: `Pergunta "${question.key}" tem options_source.filtered_by apontando para pergunta inexistente: ${filteredBy}`,
			});
			continue;
		}
		if (controller.scope !== question.scope) {
			issues.push({
				code: "OPTIONS_SOURCE_FILTERED_BY_SCOPE_MISMATCH",
				message: `Pergunta "${question.key}" tem options_source.filtered_by para "${filteredBy}", de escopo diferente`,
			});
		}
		if (
			controller.type !== "CHOICE" ||
			!("options_source" in controller) ||
			!controller.options_source
		) {
			issues.push({
				code: "OPTIONS_SOURCE_FILTERED_BY_NOT_CATALOG",
				message: `Pergunta "${question.key}" tem options_source.filtered_by para "${filteredBy}", que não vem de catálogo externo`,
			});
		}
	}

	return issues;
}

function checkDependsOn(protocol: Protocol): ProtocolIssue[] {
	const issues: ProtocolIssue[] = [];
	const questionsByKey = new Map(protocol.questions.map((q) => [q.key, q]));

	for (const question of protocol.questions) {
		if (!question.depends_on) continue;
		const { question_key: controllerKey, equals } = question.depends_on;

		const controller = questionsByKey.get(controllerKey);
		if (!controller) {
			issues.push({
				code: "DEPENDS_ON_QUESTION_UNDEFINED",
				message: `Pergunta "${question.key}" depende de pergunta inexistente: ${controllerKey}`,
			});
			continue;
		}

		if (controller.scope !== question.scope) {
			issues.push({
				code: "DEPENDS_ON_SCOPE_MISMATCH",
				message: `Pergunta "${question.key}" depende de "${controllerKey}", de escopo diferente`,
			});
		}

		const controllerOptions = optionsOf(controller);
		if (controllerOptions === undefined) {
			issues.push({
				code: "DEPENDS_ON_CONTROLLER_HAS_NO_INLINE_OPTIONS",
				message: `Pergunta "${question.key}" depende de "${controllerKey}", cujas opções vêm de catálogo externo e não podem ser validadas estaticamente`,
			});
		} else if (!controllerOptions.some((option) => option.key === equals)) {
			issues.push({
				code: "DEPENDS_ON_VALUE_NOT_IN_OPTIONS",
				message: `Pergunta "${question.key}" depende de "${controllerKey}" ter valor "${equals}", que não é uma opção dela`,
			});
		}
	}

	// Ciclo: grafo funcional (cada pergunta tem no máximo um depends_on), então basta
	// caminhar a cadeia a partir de cada pergunta com depends_on marcando visitados.
	const dependsOnOf = new Map(
		protocol.questions
			.filter((q) => q.depends_on)
			.map((q) => [q.key, q.depends_on!.question_key]),
	);
	const reportedCycleMembers = new Set<string>();

	for (const question of protocol.questions) {
		if (!question.depends_on || reportedCycleMembers.has(question.key))
			continue;

		const visited = new Set<string>([question.key]);
		let current = question.depends_on.question_key;
		while (dependsOnOf.has(current)) {
			if (visited.has(current)) {
				for (const member of visited) reportedCycleMembers.add(member);
				issues.push({
					code: "DEPENDS_ON_CYCLE",
					message: `Ciclo de depends_on envolvendo a pergunta "${question.key}"`,
				});
				break;
			}
			visited.add(current);
			current = dependsOnOf.get(current)!;
		}
	}

	return issues;
}

export function collectProtocolIssues(protocol: Protocol): ProtocolIssue[] {
	return [
		...checkDuplicateCodes(protocol),
		...checkSuiteTaskReferences(protocol),
		...checkPersonaSuiteReferences(protocol),
		...checkOptionsShape(protocol),
		...checkOptionsSourceFilters(protocol),
		...checkDependsOn(protocol),
	];
}

export function validateProtocol(protocol: Protocol): void {
	const issues = collectProtocolIssues(protocol);
	if (issues.length > 0) throw new ProtocolValidationError(issues);
}
