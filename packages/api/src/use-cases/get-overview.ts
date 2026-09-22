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

export interface OverviewStats extends UsabilityMetrics {
	/** Sessões da versão no período, em qualquer status. */
	totalSessions: number;
	porStatus: Record<string, number>;
	/** Sessões concluídas: o N sobre o qual as métricas são calculadas. */
	sessoesConcluidas: number;
}

export interface SessionsPerDay {
	date: string;
	porPersona: Record<string, number>;
}

export interface OverviewResult {
	stats: OverviewStats;
	sessoesPorDia: SessionsPerDay[];
}

/**
 * Visão geral: contagem de sessões por status e Te/Tf/Ts/Us globais sobre todas as
 * tarefas e respostas das sessões concluídas, como em Lima et al. (2013), sem média
 * entre suítes. A série diária conta só sessões concluídas.
 */
export async function getOverview(
	repositories: Repositories,
	range: DateRange,
): Promise<OverviewResult> {
	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();
	const [sessions, completedSessions, taskRuns, satisfactionAnswers] =
		await Promise.all([
			repositories.sessions.findInRange(range, protocolVersionId),
			repositories.sessions.findCompletedInRange(range, protocolVersionId),
			repositories.taskRuns.findInRange(range, protocolVersionId),
			repositories.answers.findByQuestionKey(
				protocolVersionId,
				"satisfaction",
				range,
			),
		]);

	const porStatus: Record<string, number> = {};
	for (const session of sessions) {
		porStatus[session.status] = (porStatus[session.status] ?? 0) + 1;
	}

	const sessionsByDay = groupBy(completedSessions, (session) =>
		dayKey(session.startedAt),
	);
	const sessoesPorDia: SessionsPerDay[] = [...sessionsByDay.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, daySessions]) => {
			const porPersona: Record<string, number> = {};
			for (const session of daySessions) {
				porPersona[session.persona] = (porPersona[session.persona] ?? 0) + 1;
			}
			return { date, porPersona };
		});

	return {
		stats: {
			totalSessions: sessions.length,
			porStatus,
			sessoesConcluidas: completedSessions.length,
			...calcularUsabilidade(
				taskRuns,
				satisfactionAnswers,
				limitesDeEficiencia(taskRuns),
			),
		},
		sessoesPorDia,
	};
}

function dayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}
