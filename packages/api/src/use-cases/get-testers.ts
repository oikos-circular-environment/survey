import type {
	DateRange,
	Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";

export type TesterStatusFilter = "active" | "deleted" | "all";

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
	deletedAt: string | null;
}

export interface PaginatedTesters {
	items: TesterListRow[];
	total: number;
	page: number;
	pageSize: number;
}

export interface GetTestersInput {
	range: DateRange;
	status: TesterStatusFilter;
	page: number;
	pageSize: number;
	/** Aceita com ou sem o prefixo "PSQ-" exibido na UI; comparação exata (case-insensitive). */
	participantCode?: string;
}

const SCREENER_KEYS = ["age_range", "education_level"] as const;

/**
 * Alimenta o painel de gerenciamento de testadores — uma linha por sessão (ou, na aba
 * "Deletados", por registro de auditoria de uma sessão já apagada), com os dados que
 * identificam o teste (não a pessoa): persona, status, screener resolvido em rótulo,
 * aparelho, tempos. Rótulos de `ageRange`/`educationLevel` vêm de
 * `personaDefs`/`questions.options` (mesma fonte que a Caracterização usa), não
 * hardcoded. Paginado em memória, mesmo padrão de `get-tasks.ts`.
 */
export async function getTesters(
	repositories: Repositories,
	{ range, status, page, pageSize, participantCode }: GetTestersInput,
): Promise<PaginatedTesters> {
	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();

	const [activeSessions, deletedSessions, personaDefs, questionOptions] =
		await Promise.all([
			status === "deleted"
				? Promise.resolve([])
				: repositories.sessions.findAllDetailedInRange(range),
			status === "active"
				? Promise.resolve([])
				: repositories.sessions.findDeletedInRange(range),
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

	const activeRows: TesterListRow[] = activeSessions.map((session) => ({
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
		deletedAt: null,
	}));

	const deletedRows: TesterListRow[] = deletedSessions.map((session) => ({
		sessionId: session.sessionId,
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
		deletedAt: session.deletedAt.toISOString(),
	}));

	const normalizedCode = participantCode
		?.trim()
		.replace(/^psq-/i, "")
		.toUpperCase();

	const filtered = normalizedCode
		? [...activeRows, ...deletedRows].filter(
				(row) => row.participantCode.toUpperCase() === normalizedCode,
			)
		: [...activeRows, ...deletedRows];

	const items = filtered.sort(
		(a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
	);

	const total = items.length;
	const start = (page - 1) * pageSize;
	return {
		items: items.slice(start, start + pageSize),
		total,
		page,
		pageSize,
	};
}
