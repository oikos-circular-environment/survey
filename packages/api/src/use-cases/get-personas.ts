import {
	classificar,
	eficacia,
	eficiencia,
	nivelDeUsabilidade,
	satisfacaoMedia,
	satisfacaoTaxa,
} from "@oikos-circular-environment/survey-db/metrics/index";
import type {
	DateRange,
	Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";

import { bounds, groupBy } from "./shared/aggregate";

export interface PersonaMetrics {
	key: string;
	label: string;
	participantes: number;
	eficacia: number;
	eficiencia: number;
	satisfacaoMedia: number;
	nivelDeUsabilidade: number;
	classificacao: string;
}

/**
 * Alimenta a tabela "Por persona" do dashboard.
 *
 * Reaproveita os mesmos limites de eficiência de nível de SUÍTE que `getSuites` usa
 * (calculados sobre todas as execuções de suíte do período) — o Tf de uma persona é a
 * média de eficiência das suítes que ela executou, então precisa estar na mesma escala
 * dos Tf's individuais de suíte, não numa escala própria por persona.
 */
export async function getPersonas(
	repositories: Repositories,
	range: DateRange,
): Promise<PersonaMetrics[]> {
	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();
	const [personaDefs, sessions, suiteRuns, satisfactionAnswers] =
		await Promise.all([
			repositories.protocol.getPersonaDefs(protocolVersionId),
			repositories.sessions.findInRange(range),
			repositories.suiteRuns.findInRange(range),
			repositories.answers.findByQuestionKey(
				protocolVersionId,
				"satisfaction",
				range,
			),
		]);

	const personaBySessionId = new Map(sessions.map((s) => [s.id, s.persona]));
	const efficiencyBounds = bounds(suiteRuns.map((run) => run.activeMs));

	const sessionsByPersona = groupBy(sessions, (s) => s.persona);
	const runsByPersona = groupBy(suiteRuns, (run) => run.persona);
	const satisfactionByPersona = groupBy(
		satisfactionAnswers.filter((answer) => answer.valueNumber !== null),
		(answer) => personaBySessionId.get(answer.sessionId) ?? "",
	);

	return personaDefs.map((persona) => {
		const runs = runsByPersona.get(persona.key) ?? [];
		const outcomes = runs
			.map((run) => run.outcome)
			.filter(
				(outcome): outcome is "YES" | "PARTIAL" | "NO" => outcome !== null,
			);

		const te = eficacia(outcomes);
		const tf = eficiencia(
			runs.map((run) => run.activeMs),
			efficiencyBounds,
		);
		const satMedia = satisfacaoMedia(
			(satisfactionByPersona.get(persona.key) ?? []).map(
				(a) => a.valueNumber as number,
			),
		);
		const ts = satMedia === 0 ? 0 : satisfacaoTaxa(satMedia);
		const nivel = nivelDeUsabilidade({ te, tf, ts });

		return {
			key: persona.key,
			label: persona.label,
			participantes: (sessionsByPersona.get(persona.key) ?? []).length,
			eficacia: te,
			eficiencia: tf,
			satisfacaoMedia: satMedia,
			nivelDeUsabilidade: nivel,
			classificacao: classificar(nivel),
		};
	});
}
