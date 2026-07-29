import { classificar, nivelDeUsabilidade } from "@survey/db/metrics/index";
import type { DateRange, Repositories } from "@survey/db/repositories/index";

import { getSuites } from "./get-suites";
import { groupBy, mean } from "./shared/aggregate";

export interface OverviewStats {
	totalSessions: number;
	porStatus: Record<string, number>;
	eficaciaMedia: number;
	eficienciaMedia: number;
	nivelDeUsabilidadeMedio: number;
	classificacao: string;
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
 * Alimenta a Visão geral: os 4 cards de estatística (total de sessões, Eficácia,
 * Eficiência, Nível de Usabilidade médios) e a série diária por persona que vira o
 * area chart.
 *
 * As médias de Eficácia/Eficiência/Nível de Usabilidade são a média NÃO PONDERADA das
 * métricas por suíte (`getSuites`) — cada suíte pesa igual independente de quantas
 * execuções teve, mesma convenção usada no card "Nível de Usabilidade" desenhado no
 * Pencil.
 */
export async function getOverview(
	repositories: Repositories,
	range: DateRange,
): Promise<OverviewResult> {
	const [sessions, suites] = await Promise.all([
		repositories.sessions.findInRange(range),
		getSuites(repositories, range),
	]);

	const porStatus: Record<string, number> = {};
	for (const session of sessions) {
		porStatus[session.status] = (porStatus[session.status] ?? 0) + 1;
	}

	const eficaciaMedia = mean(suites.map((suite) => suite.eficacia));
	const eficienciaMedia = mean(suites.map((suite) => suite.eficiencia));
	const nivelDeUsabilidadeMedio = nivelDeUsabilidade({
		te: eficaciaMedia,
		tf: eficienciaMedia,
		ts: mean(
			suites
				.filter((suite) => suite.satisfacaoMedia > 0)
				.map((suite) => (suite.satisfacaoMedia - 1) / 4),
		),
	});

	const sessionsByDay = groupBy(sessions, (session) =>
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
			eficaciaMedia,
			eficienciaMedia,
			nivelDeUsabilidadeMedio,
			classificacao: classificar(nivelDeUsabilidadeMedio),
		},
		sessoesPorDia,
	};
}

function dayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}
