import type {
	DateRange,
	Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";

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

export interface CompletedSessionStart {
	persona: string;
	/** ISO 8601; o agrupamento por dia acontece no navegador, no fuso de quem vê. */
	startedAt: string;
}

export interface OverviewResult {
	stats: OverviewStats;
	sessoesConcluidasInicio: CompletedSessionStart[];
}

/**
 * Visão geral: contagem de sessões por status e Te/Tf/Ts/Us globais sobre todas as
 * tarefas e respostas das sessões concluídas, como em Lima et al. (2013), sem média
 * entre suítes. O gráfico diário recebe o início de cada sessão concluída.
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

	const sessoesConcluidasInicio = completedSessions.map((session) => ({
		persona: session.persona,
		startedAt: session.startedAt.toISOString(),
	}));

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
		sessoesConcluidasInicio,
	};
}
