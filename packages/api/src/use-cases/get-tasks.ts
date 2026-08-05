import {
	eficacia,
	eficiencia,
} from "@oikos-circular-environment/survey-db/metrics/index";
import type {
	DateRange,
	Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";

import { bounds, groupBy } from "./shared/aggregate";

export interface TaskMetrics {
	code: string;
	title: string;
	suiteCode: string;
	tentativas: number;
	eficacia: number;
	eficiencia: number;
}

export interface PaginatedTasks {
	items: TaskMetrics[];
	total: number;
	page: number;
	pageSize: number;
}

export interface GetTasksInput {
	range: DateRange;
	page: number;
	pageSize: number;
}

/**
 * Alimenta a tabela micro (por tarefa) do dashboard, paginada.
 *
 * Os limites `min`/`max` de eficiência vêm de todas as execuções de TAREFA do período —
 * uma escala própria, bem menor que a de suíte (segundos/minutos por tarefa contra
 * minutos/dezenas de minutos por suíte). Nunca reaproveitar os limites de
 * `getSuites` aqui — foi um bug real corrigido durante o design do dashboard.
 */
export async function getTasks(
	repositories: Repositories,
	{ range, page, pageSize }: GetTasksInput,
): Promise<PaginatedTasks> {
	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();
	const [taskDefs, taskRuns] = await Promise.all([
		repositories.protocol.getTaskDefs(protocolVersionId),
		repositories.taskRuns.findInRange(range),
	]);

	const efficiencyBounds = bounds(taskRuns.map((run) => run.activeMs));
	const runsByTaskId = groupBy(taskRuns, (run) => run.taskId);

	const items: TaskMetrics[] = taskDefs.map((task) => {
		const runs = runsByTaskId.get(task.id) ?? [];
		const outcomes = runs
			.map((run) => run.outcome)
			.filter(
				(outcome): outcome is "YES" | "PARTIAL" | "NO" => outcome !== null,
			);

		return {
			code: task.code,
			title: task.title,
			suiteCode: task.suiteCode,
			tentativas: runs.length,
			eficacia: eficacia(outcomes),
			eficiencia: eficiencia(
				runs.map((run) => run.activeMs),
				efficiencyBounds,
			),
		};
	});

	const total = items.length;
	const start = (page - 1) * pageSize;
	return { items: items.slice(start, start + pageSize), total, page, pageSize };
}
