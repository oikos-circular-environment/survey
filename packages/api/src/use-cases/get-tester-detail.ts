import type { Repositories } from "@oikos-circular-environment/survey-db/repositories/index";

export interface TesterTaskRun {
	taskCode: string;
	taskTitle: string;
	position: number;
	outcome: "YES" | "PARTIAL" | "NO" | null;
	activeMs: number;
	/**
	 * `false` significa que a tarefa foi resolvida à mão (pular/abandonar) em vez de
	 * detectada por sinal. Concentração de manuais onde se esperava sinal automático é
	 * sintoma de sinal quebrado no protocolo.
	 */
	autoDetected: boolean;
	startedAt: string;
	finishedAt: string | null;
}

export interface TesterSuiteAnswer {
	questionKey: string;
	questionLabel: string;
	questionType: string;
	position: number;
	value: number | null;
	valueLabel: string | null;
	valueText: string | null;
}

export interface TesterSuiteRun {
	suiteRunId: string;
	suiteCode: string;
	suiteTitle: string;
	position: number;
	outcome: "YES" | "PARTIAL" | "NO" | null;
	activeMs: number;
	wallMs: number;
	startedAt: string;
	finishedAt: string | null;
	tasks: TesterTaskRun[];
	answers: TesterSuiteAnswer[];
}

export interface TesterDetail {
	sessionId: string;
	participantCode: string;
	persona: string;
	status: string;
	stateUf: string;
	cityName: string;
	ageRange: string;
	educationLevel: string;
	chainRole: string;
	wasteContactFrequency: string;
	appExperience: string;
	consentVersion: string;
	consentAt: string;
	deviceOs: string;
	deviceOsVersion: string;
	appVersion: string;
	screenSize: string;
	startedAt: string;
	finishedAt: string | null;
	activeMs: number;
	wallMs: number;
	abandonReason: string | null;
	suiteRuns: TesterSuiteRun[];
	freeComment: string | null;
}

const SCREENER_KEYS = [
	"age_range",
	"education_level",
	"chain_role",
	"waste_contact_frequency",
	"app_experience",
] as const;

/**
 * Detalhe completo de UM testador (sessão) — alimenta o painel que abre ao selecionar
 * uma linha no gerenciamento de testadores: todo o screener resolvido em rótulo,
 * aparelho, tempos de consentimento/início/fim, a execução de cada suíte que essa
 * sessão passou, e o comentário livre (se houver). Nenhum dado identificável — o
 * schema já garante isso, ver `schema/collection.ts`.
 */
export async function getTesterDetail(
	repositories: Repositories,
	sessionId: string,
): Promise<TesterDetail | null> {
	const session = await repositories.sessions.findDetailById(sessionId);
	if (!session) return null;

	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();
	const [personaDefs, questionOptions, suiteDefs, suiteRuns, freeComment] =
		await Promise.all([
			repositories.protocol.getPersonaDefs(protocolVersionId),
			repositories.protocol.getQuestionOptions(protocolVersionId, [
				...SCREENER_KEYS,
			]),
			repositories.protocol.getSuiteDefs(protocolVersionId),
			repositories.suiteRuns.findBySessionId(sessionId),
			repositories.answers.findFreeCommentBySessionId(
				protocolVersionId,
				sessionId,
			),
		]);

	const suiteRunIds = suiteRuns.map((run) => run.id);
	const [taskRuns, suiteAnswers] = await Promise.all([
		repositories.taskRuns.findBySuiteRunIds(suiteRunIds),
		repositories.answers.findBySuiteRunIds(suiteRunIds),
	]);

	const tasksBySuiteRun = new Map<string, TesterTaskRun[]>();
	for (const run of taskRuns) {
		const list = tasksBySuiteRun.get(run.suiteRunId) ?? [];
		list.push({
			taskCode: run.taskCode,
			taskTitle: run.taskTitle,
			position: run.position,
			outcome: run.outcome,
			activeMs: run.activeMs,
			autoDetected: run.autoDetected,
			startedAt: run.startedAt.toISOString(),
			finishedAt: run.finishedAt?.toISOString() ?? null,
		});
		tasksBySuiteRun.set(run.suiteRunId, list);
	}

	const answersBySuiteRun = new Map<string, TesterSuiteAnswer[]>();
	for (const answer of suiteAnswers) {
		if (!answer.suiteRunId) continue;
		const list = answersBySuiteRun.get(answer.suiteRunId) ?? [];
		const option = answer.options?.find((o) => o.value === answer.valueNumber);
		list.push({
			questionKey: answer.questionKey,
			questionLabel: answer.questionLabel,
			questionType: answer.questionType,
			position: answer.position,
			value: answer.valueNumber,
			valueLabel: option?.label ?? null,
			valueText: answer.valueText,
		});
		answersBySuiteRun.set(answer.suiteRunId, list);
	}

	const personaLabelByKey = new Map(
		personaDefs.map((persona) => [persona.key, persona.label]),
	);
	const optionsByQuestionKey = new Map(
		questionOptions.map((q) => [q.key, q.options]),
	);
	const suiteDefById = new Map(suiteDefs.map((suite) => [suite.id, suite]));

	function labelByKey(questionKey: string, optionKey: string): string {
		const option = optionsByQuestionKey
			.get(questionKey)
			?.find((o) => o.key === optionKey);
		return option?.label ?? optionKey;
	}

	function labelByValue(questionKey: string, value: number): string {
		const option = optionsByQuestionKey
			.get(questionKey)
			?.find((o) => o.value === value);
		return option?.label ?? String(value);
	}

	return {
		sessionId: session.id,
		participantCode: session.participantCode,
		persona: personaLabelByKey.get(session.persona) ?? session.persona,
		status: session.status,
		stateUf: session.stateUf,
		cityName: session.cityName,
		ageRange: labelByKey("age_range", session.ageRange),
		educationLevel: labelByKey("education_level", session.educationLevel),
		chainRole: labelByKey("chain_role", session.chainRole),
		wasteContactFrequency: labelByValue(
			"waste_contact_frequency",
			session.wasteContactFrequency,
		),
		appExperience: labelByValue("app_experience", session.appExperience),
		consentVersion: session.consentVersion,
		consentAt: session.consentAt.toISOString(),
		deviceOs: session.deviceOs,
		deviceOsVersion: session.deviceOsVersion,
		appVersion: session.appVersion,
		screenSize: session.screenSize,
		startedAt: session.startedAt.toISOString(),
		finishedAt: session.finishedAt?.toISOString() ?? null,
		activeMs: session.activeMs,
		wallMs: session.wallMs,
		abandonReason: session.abandonReason,
		suiteRuns: suiteRuns.map((run) => {
			const suite = suiteDefById.get(run.suiteId);
			return {
				suiteRunId: run.id,
				suiteCode: suite?.code ?? run.suiteId,
				suiteTitle: suite?.title ?? "",
				position: run.position,
				outcome: run.outcome,
				activeMs: run.activeMs,
				wallMs: run.wallMs,
				startedAt: run.startedAt.toISOString(),
				finishedAt: run.finishedAt?.toISOString() ?? null,
				tasks: tasksBySuiteRun.get(run.id) ?? [],
				answers: answersBySuiteRun.get(run.id) ?? [],
			};
		}),
		freeComment,
	};
}
