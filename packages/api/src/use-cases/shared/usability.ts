import {
	classificar,
	eficacia,
	eficiencia,
	nivelDeUsabilidade,
	satisfacaoTaxa,
} from "@oikos-circular-environment/survey-db/metrics/index";

import { bounds, groupBy, mean } from "./aggregate";

type Outcome = "YES" | "PARTIAL" | "NO";

export interface TaskSample {
	outcome: Outcome | null;
	activeMs: number;
}

export interface SatisfactionSample {
	sessionId: string;
	valueNumber: number | null;
}

export interface EfficiencyBoundsMs {
	min: number;
	max: number;
}

export interface UsabilityMetrics {
	/** ΣTAR: tarefas realizadas (com resultado registrado). */
	tarefasRealizadas: number;
	/** ΣTARc: tarefas concluídas (outcome YES). */
	tarefasConcluidas: number;
	eficacia: number | null;
	/** Tarefas concluídas com tempo ativo medido, base do tméd. */
	tarefasCronometradas: number;
	tempoMedioMs: number | null;
	eficienciaBoundsMs: EfficiencyBoundsMs;
	eficiencia: number | null;
	/** Sessões com resposta de satisfação, base do Ts. */
	sessoesComSatisfacao: number;
	/** Média bruta 1–5 das médias por sessão. */
	satisfacaoMedia: number | null;
	satisfacao: number | null;
	nivelDeUsabilidade: number | null;
	classificacao: string | null;
}

/**
 * Tempos que entram no Tf de Lima et al. (2013): só tarefas concluídas. Tempo zero é
 * falha de medição do app, não execução instantânea, e fica fora.
 */
export function temposDeTarefasConcluidas(tasks: TaskSample[]): number[] {
	return tasks
		.filter((task) => task.outcome === "YES" && task.activeMs > 0)
		.map((task) => task.activeMs);
}

/** tmín/tmáx observados sobre todas as tarefas concluídas do recorte. */
export function limitesDeEficiencia(tasks: TaskSample[]): EfficiencyBoundsMs {
	return bounds(temposDeTarefasConcluidas(tasks));
}

/**
 * Te, Tf, Ts e Us de um grupo de tarefas e respostas de satisfação. Te = ΣTARc/ΣTAR;
 * Tf = 1 − tméd/(tmáx − tmín) com os limites do recorte inteiro; Ts = média, entre
 * sessões, da taxa (média − 1)/4 de cada sessão. Sem dado, a métrica fica nula e o Us
 * também, em vez de virar zero.
 */
export function calcularUsabilidade(
	tasks: TaskSample[],
	satisfaction: SatisfactionSample[],
	efficiencyBounds: EfficiencyBoundsMs,
): UsabilityMetrics {
	const outcomes = tasks
		.map((task) => task.outcome)
		.filter((outcome): outcome is Outcome => outcome !== null);
	const te = outcomes.length > 0 ? eficacia(outcomes) : null;

	const tempos = temposDeTarefasConcluidas(tasks);
	const tf = tempos.length > 0 ? eficiencia(tempos, efficiencyBounds) : null;

	const valuesBySession = groupBy(
		satisfaction.filter((answer) => answer.valueNumber !== null),
		(answer) => answer.sessionId,
	);
	const sessionMeans = [...valuesBySession.values()].map((answers) =>
		mean(answers.map((answer) => answer.valueNumber as number)),
	);
	const satMedia = sessionMeans.length > 0 ? mean(sessionMeans) : null;
	const ts = satMedia === null ? null : satisfacaoTaxa(satMedia);

	const us =
		te === null || tf === null || ts === null
			? null
			: nivelDeUsabilidade({ te, tf, ts });

	return {
		tarefasRealizadas: outcomes.length,
		tarefasConcluidas: outcomes.filter((outcome) => outcome === "YES").length,
		eficacia: te,
		tarefasCronometradas: tempos.length,
		tempoMedioMs: tempos.length > 0 ? mean(tempos) : null,
		eficienciaBoundsMs: efficiencyBounds,
		eficiencia: tf,
		sessoesComSatisfacao: sessionMeans.length,
		satisfacaoMedia: satMedia,
		satisfacao: ts,
		nivelDeUsabilidade: us,
		classificacao: us === null ? null : classificar(us),
	};
}
