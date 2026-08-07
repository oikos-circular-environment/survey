import type {
	Option,
	QuestionDependency,
	SuccessRule,
} from "@oikos-circular-environment/survey-db/protocol/types";
import type { Repositories } from "@oikos-circular-environment/survey-db/repositories/index";

export interface ProtocolPersonaSuiteResponse {
	suite_code: string;
	specific_objectives: string[];
}

export interface ProtocolPersonaResponse {
	key: string;
	label: string;
	description: string;
	suites: ProtocolPersonaSuiteResponse[];
}

export interface ProtocolSuiteResponse {
	code: string;
	title: string;
	objective: string;
	task_codes: string[];
}

export interface ProtocolTaskResponse {
	code: string;
	title: string;
	instruction: string;
	success: SuccessRule;
}

export interface ProtocolQuestionResponse {
	key: string;
	scope: string;
	type: string;
	position: number;
	label: string;
	helper_text?: string;
	info_text?: string;
	required: boolean;
	options?: Option[];
	max_length?: number;
	depends_on?: QuestionDependency;
}

export interface ProtocolResponse {
	key: string;
	version: number;
	personas: ProtocolPersonaResponse[];
	suites: ProtocolSuiteResponse[];
	tasks: ProtocolTaskResponse[];
	questions: ProtocolQuestionResponse[];
}

/**
 * E1 — devolve a versão vigente do protocolo, lendo das tabelas materializadas pelo
 * seed (não do arquivo `protocol/data.ts`, que é a fonte só até o seed rodar). É a
 * única leitura do módulo de usabilidade; as chamadas seguintes (E2–E5) já não
 * consultam mais o protocolo, salvo para resolver código→id internamente.
 *
 * Devolve `null` quando a `key` existe mas nenhuma versão está `is_active` — desligado
 * de propósito pelo painel do pesquisador, distinto do erro de seed ausente.
 */
export async function getProtocol(
	repositories: Repositories,
	key = "oikos-walkthrough",
): Promise<ProtocolResponse | null> {
	const version = await repositories.protocol.getActiveProtocolVersion(key);
	if (!version) return null;

	return buildProtocolResponse(repositories, version);
}

/**
 * Mesma resposta de `getProtocol`, mas para uma versão explícita — o painel navega
 * pelo histórico, e ler uma sessão antiga com a definição vigente induz a erro: códigos
 * de tarefa foram renumerados entre versões. Ignora `is_active` de propósito; versão
 * desligada continua legível para análise.
 */
export async function getProtocolByVersionId(
	repositories: Repositories,
	protocolVersionId: string,
): Promise<ProtocolResponse | null> {
	const version =
		await repositories.protocol.findProtocolVersionById(protocolVersionId);
	if (!version) return null;

	return buildProtocolResponse(repositories, version);
}

async function buildProtocolResponse(
	repositories: Repositories,
	version: { id: string; key: string; version: number },
): Promise<ProtocolResponse> {
	const [personas, suites, tasks, questions] = await Promise.all([
		repositories.protocol.getProtocolPersonas(version.id),
		repositories.protocol.getProtocolSuites(version.id),
		repositories.protocol.getProtocolTasks(version.id),
		repositories.protocol.getProtocolQuestions(version.id),
	]);

	return {
		key: version.key,
		version: version.version,
		personas: personas.map((persona) => ({
			key: persona.key,
			label: persona.label,
			description: persona.description,
			suites: persona.suites.map((suite) => ({
				suite_code: suite.suiteCode,
				specific_objectives: suite.specificObjectives,
			})),
		})),
		suites: suites.map((suite) => ({
			code: suite.code,
			title: suite.title,
			objective: suite.objective,
			task_codes: suite.taskCodes,
		})),
		tasks: tasks.map((task) => ({
			code: task.code,
			title: task.title,
			instruction: task.instruction,
			success: task.successRule,
		})),
		questions: questions.map((question) => ({
			key: question.key,
			scope: question.scope,
			type: question.type,
			position: question.position,
			label: question.label,
			helper_text: question.helperText ?? undefined,
			info_text: question.infoText ?? undefined,
			required: question.required,
			options: question.options ?? undefined,
			max_length: question.maxLength ?? undefined,
			depends_on: question.dependsOn ?? undefined,
		})),
	};
}
