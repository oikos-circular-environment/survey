import type {
	DateRange,
	Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";

export interface TesterListRow {
	sessionId: string;
	participantCode: string;
	persona: string;
	status: string;
	stateUf: string;
	cityName: string;
	ageRange: string;
	educationLevel: string;
	deviceOs: string;
	deviceOsVersion: string;
	startedAt: string;
	finishedAt: string | null;
	activeMs: number;
}

const SCREENER_KEYS = ["age_range", "education_level"] as const;

/**
 * Alimenta o painel de gerenciamento de testadores — uma linha por sessão, com os
 * dados que identificam o teste (não a pessoa): persona, status, screener resolvido em
 * rótulo, aparelho, tempos. Rótulos de `ageRange`/`educationLevel` vêm de
 * `personaDefs`/`questions.options` (mesma fonte que a Caracterização usa), não
 * hardcoded.
 */
export async function getTesters(
	repositories: Repositories,
	range: DateRange,
): Promise<TesterListRow[]> {
	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();
	const [sessions, personaDefs, questionOptions] = await Promise.all([
		repositories.sessions.findAllDetailedInRange(range),
		repositories.protocol.getPersonaDefs(protocolVersionId),
		repositories.protocol.getQuestionOptions(protocolVersionId, [
			...SCREENER_KEYS,
		]),
	]);

	const personaLabelByKey = new Map(
		personaDefs.map((persona) => [persona.key, persona.label]),
	);
	const optionsByQuestionKey = new Map(
		questionOptions.map((q) => [q.key, q.options]),
	);

	function labelFor(questionKey: string, optionKey: string): string {
		const option = optionsByQuestionKey
			.get(questionKey)
			?.find((o) => o.key === optionKey);
		return option?.label ?? optionKey;
	}

	return sessions
		.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
		.map((session) => ({
			sessionId: session.id,
			participantCode: session.participantCode,
			persona: personaLabelByKey.get(session.persona) ?? session.persona,
			status: session.status,
			stateUf: session.stateUf,
			cityName: session.cityName,
			ageRange: labelFor("age_range", session.ageRange),
			educationLevel: labelFor("education_level", session.educationLevel),
			deviceOs: session.deviceOs,
			deviceOsVersion: session.deviceOsVersion,
			startedAt: session.startedAt.toISOString(),
			finishedAt: session.finishedAt?.toISOString() ?? null,
			activeMs: session.activeMs,
		}));
}
