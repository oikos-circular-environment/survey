import type {
	DateRange,
	Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";

import { groupBy } from "./shared/aggregate";
import {
	calcularUsabilidade,
	type EfficiencyBoundsMs,
	limitesDeEficiencia,
} from "./shared/usability";

export interface TaskMetrics {
	code: string;
	title: string;
	suiteCode: string;
	/** Participantes que realizaram a tarefa (ΣTAR da tarefa). */
	tentativas: number;
	/** Participantes que concluíram a tarefa (ΣTARc da tarefa). */
	concluidas: number;
	eficacia: number | null;
	tempoMedioMs: number | null;
	eficienciaBoundsMs: EfficiencyBoundsMs;
	eficiencia: number | null;
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
 * Tabela por tarefa, no formato da Tabela 1 de Lima et al. (2013): quantos
 * participantes realizaram e concluíram cada tarefa, tempo médio das conclusões e Tf
 * contra os extremos de todas as tarefas concluídas do recorte.
 */
export async function getTasks(
	repositories: Repositories,
	{ range, page, pageSize }: GetTasksInput,
): Promise<PaginatedTasks> {
	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();
	const [taskDefs, taskRuns] = await Promise.all([
		repositories.protocol.getTaskDefs(protocolVersionId),
		repositories.taskRuns.findInRange(range, protocolVersionId),
	]);

	const efficiencyBounds = limitesDeEficiencia(taskRuns);
	const runsByTaskId = groupBy(taskRuns, (run) => run.taskId);

	const items: TaskMetrics[] = taskDefs.map((task) => {
		const metrics = calcularUsabilidade(
			runsByTaskId.get(task.id) ?? [],
			[],
			efficiencyBounds,
		);
		return {
			code: task.code,
			title: task.title,
			suiteCode: task.suiteCode,
			tentativas: metrics.tarefasRealizadas,
			concluidas: metrics.tarefasConcluidas,
			eficacia: metrics.eficacia,
			tempoMedioMs: metrics.tempoMedioMs,
			eficienciaBoundsMs: efficiencyBounds,
			eficiencia: metrics.eficiencia,
		};
	});

	const total = items.length;
	const start = (page - 1) * pageSize;
	return { items: items.slice(start, start + pageSize), total, page, pageSize };
}
