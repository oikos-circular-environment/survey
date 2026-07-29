import type {
	DateRange,
	Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";

export interface DistributionBucket {
	key: string;
	label: string;
	count: number;
}

export interface DemographicsResult {
	ageRange: DistributionBucket[];
	educationLevel: DistributionBucket[];
	chainRole: DistributionBucket[];
	wasteContactFrequency: DistributionBucket[];
	appExperience: DistributionBucket[];
}

const SCREENER_KEYS = [
	"age_range",
	"education_level",
	"chain_role",
	"waste_contact_frequency",
	"app_experience",
] as const;

/**
 * Alimenta a Caracterização dos participantes — uma distribuição por bucket para cada
 * campo de screener. Os rótulos vêm das `options` já semeadas em `usability_questions`
 * (mesma fonte que o app usa para renderizar o formulário), não de uma cópia hardcoded
 * aqui — evita as duas divergirem se o protocolo for republicado.
 */
export async function getDemographics(
	repositories: Repositories,
	range: DateRange,
): Promise<DemographicsResult> {
	const protocolVersionId =
		await repositories.protocol.getActiveProtocolVersionId();
	const [sessions, questionOptions] = await Promise.all([
		repositories.sessions.findInRange(range),
		repositories.protocol.getQuestionOptions(protocolVersionId, [
			...SCREENER_KEYS,
		]),
	]);

	const optionsByQuestionKey = new Map(
		questionOptions.map((q) => [q.key, q.options]),
	);

	/**
	 * `ageRange`/`educationLevel`/`chainRole` gravam a `key` do enum (ex.: "AGE_18_24")
	 * na sessão — casam com `option.key`. `wasteContactFrequency`/`appExperience` são
	 * perguntas `SCALE`: a sessão grava o `value` ordinal (1..5) direto, não a `key` —
	 * casam com `option.value`. Confundir os dois faz toda contagem cair em zero.
	 */
	function distributionByKey(
		questionKey: string,
		getValue: (session: (typeof sessions)[number]) => string,
	): DistributionBucket[] {
		const options = optionsByQuestionKey.get(questionKey) ?? [];
		const counts = new Map<string, number>();
		for (const session of sessions) {
			const value = getValue(session);
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
		return options
			.sort((a, b) => a.value - b.value)
			.map((option) => ({
				key: option.key,
				label: option.label,
				count: counts.get(option.key) ?? 0,
			}));
	}

	function distributionByValue(
		questionKey: string,
		getValue: (session: (typeof sessions)[number]) => number,
	): DistributionBucket[] {
		const options = optionsByQuestionKey.get(questionKey) ?? [];
		const counts = new Map<number, number>();
		for (const session of sessions) {
			const value = getValue(session);
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
		return options
			.sort((a, b) => a.value - b.value)
			.map((option) => ({
				key: option.key,
				label: option.label,
				count: counts.get(option.value) ?? 0,
			}));
	}

	return {
		ageRange: distributionByKey("age_range", (s) => s.ageRange),
		educationLevel: distributionByKey(
			"education_level",
			(s) => s.educationLevel,
		),
		chainRole: distributionByKey("chain_role", (s) => s.chainRole),
		wasteContactFrequency: distributionByValue(
			"waste_contact_frequency",
			(s) => s.wasteContactFrequency,
		),
		appExperience: distributionByValue(
			"app_experience",
			(s) => s.appExperience,
		),
	};
}
