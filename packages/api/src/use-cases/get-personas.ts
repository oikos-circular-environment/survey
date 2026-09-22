import type {
	DateRange,
	Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";

import { groupBy } from "./shared/aggregate";
import {
	calcularUsabilidade,
	limitesDeEficiencia,
	type UsabilityMetrics,
} from "./shared/usability";

export interface PersonaMetrics extends UsabilityMetrics {
	key: string;
	label: string;
	participantes: number;
}

/**
 * Métricas por persona sobre as sessões concluídas. Te e Tf vêm das tarefas das
 * sessões da persona, com os limites de Tf do recorte inteiro para ficarem na mesma
 * escala das outras telas; Ts vem do questionário pós-suíte dessas sessões.
 */
export async function getPersonas(
	repositories: Repositories,
	range: DateRange,
): Promise<PersonaMetrics[]> {
	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();
	const [personaDefs, sessions, taskRuns, satisfactionAnswers] =
		await Promise.all([
			repositories.protocol.getPersonaDefs(protocolVersionId),
			repositories.sessions.findCompletedInRange(range, protocolVersionId),
			repositories.taskRuns.findInRange(range, protocolVersionId),
			repositories.answers.findByQuestionKey(
				protocolVersionId,
				"satisfaction",
				range,
			),
		]);

	const efficiencyBounds = limitesDeEficiencia(taskRuns);
	const sessionsByPersona = groupBy(sessions, (s) => s.persona);
	const tasksByPersona = groupBy(taskRuns, (run) => run.persona);
	const satisfactionByPersona = groupBy(
		satisfactionAnswers,
		(answer) => answer.persona,
	);

	return personaDefs.map((persona) => ({
		key: persona.key,
		label: persona.label,
		participantes: (sessionsByPersona.get(persona.key) ?? []).length,
		...calcularUsabilidade(
			tasksByPersona.get(persona.key) ?? [],
			satisfactionByPersona.get(persona.key) ?? [],
			efficiencyBounds,
		),
	}));
}
