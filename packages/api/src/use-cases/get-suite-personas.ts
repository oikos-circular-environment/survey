import type { DateRange, Repositories } from "@survey/db/repositories/index";

import { groupBy, mean } from "./shared/aggregate";

export interface SuitePersonaBreakdown {
	personaKey: string;
	personaLabel: string;
	testadores: number;
	tempoMedioMs: number;
}

export interface SuitePersonasRow {
	suiteCode: string;
	suiteTitle: string;
	personas: SuitePersonaBreakdown[];
}

/**
 * Visão invertida: para cada suíte, quantos testadores de cada persona a executaram e
 * o tempo médio. S1/S2 são as únicas suítes comuns a todas as 5 personas no protocolo
 * `oikos-walkthrough` — são o único recorte realmente comparável entre todas; as
 * demais suítes só aparecem nas personas cujo roteiro as inclui (`personaSuites`).
 */
export async function getSuitePersonas(
	repositories: Repositories,
	range: DateRange,
): Promise<SuitePersonasRow[]> {
	const protocolVersionId =
		await repositories.protocol.getActiveProtocolVersionId();
	const [suiteDefs, personaDefs, suiteRuns] = await Promise.all([
		repositories.protocol.getSuiteDefs(protocolVersionId),
		repositories.protocol.getPersonaDefs(protocolVersionId),
		repositories.suiteRuns.findInRange(range),
	]);

	const runsBySuiteId = groupBy(suiteRuns, (run) => run.suiteId);

	return suiteDefs.map((suite) => {
		const runs = runsBySuiteId.get(suite.id) ?? [];
		const runsByPersona = groupBy(runs, (run) => run.persona);

		const personas: SuitePersonaBreakdown[] = personaDefs
			.filter((persona) => (runsByPersona.get(persona.key) ?? []).length > 0)
			.map((persona) => {
				const personaRuns = runsByPersona.get(persona.key) ?? [];
				return {
					personaKey: persona.key,
					personaLabel: persona.label,
					testadores: new Set(personaRuns.map((run) => run.sessionId)).size,
					tempoMedioMs: mean(personaRuns.map((run) => run.activeMs)),
				};
			});

		return { suiteCode: suite.code, suiteTitle: suite.title, personas };
	});
}
