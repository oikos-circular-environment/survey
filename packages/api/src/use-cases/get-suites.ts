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

export type { EfficiencyBoundsMs } from "./shared/usability";

export interface SuiteMetrics extends UsabilityMetrics {
	code: string;
	title: string;
	taskCount: number;
	/** Execuções da suíte (uma por sessão concluída que a percorreu). */
	execucoes: number;
}

/**
 * Métricas por suíte. Te e Tf vêm das tarefas da suíte (ΣTARc/ΣTAR e tempo médio das
 * tarefas concluídas contra os extremos do recorte inteiro); Ts vem do questionário
 * pós-suíte, que é respondido por suíte e não por tarefa.
 */
export async function getSuites(
	repositories: Repositories,
	range: DateRange,
): Promise<SuiteMetrics[]> {
	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();
	const [suiteDefs, suiteRuns, taskRuns, satisfactionAnswers] =
		await Promise.all([
			repositories.protocol.getSuiteDefs(protocolVersionId),
			repositories.suiteRuns.findInRange(range, protocolVersionId),
			repositories.taskRuns.findInRange(range, protocolVersionId),
			repositories.answers.findByQuestionKey(
				protocolVersionId,
				"satisfaction",
				range,
			),
		]);

	const efficiencyBounds = limitesDeEficiencia(taskRuns);
	const runsBySuiteId = groupBy(suiteRuns, (run) => run.suiteId);
	const tasksBySuiteId = groupBy(taskRuns, (run) => run.suiteId);
	const satisfactionBySuiteId = groupBy(
		satisfactionAnswers,
		(answer) => answer.suiteId ?? "",
	);

	return suiteDefs.map((suite) => ({
		code: suite.code,
		title: suite.title,
		taskCount: suite.taskCount,
		execucoes: (runsBySuiteId.get(suite.id) ?? []).length,
		...calcularUsabilidade(
			tasksBySuiteId.get(suite.id) ?? [],
			satisfactionBySuiteId.get(suite.id) ?? [],
			efficiencyBounds,
		),
	}));
}
