import {
	classificar,
	eficacia,
	eficiencia,
	nivelDeUsabilidade,
	satisfacaoMedia,
	satisfacaoTaxa,
} from "@survey/db/metrics/index";
import type { DateRange, Repositories } from "@survey/db/repositories/index";

import { bounds, groupBy, mean } from "./shared/aggregate";

export interface EfficiencyBoundsMs {
	min: number;
	max: number;
}

export interface SuiteMetrics {
	code: string;
	title: string;
	taskCount: number;
	execucoes: number;
	execucoesComYes: number;
	eficacia: number;
	eficiencia: number;
	tempoMedioMs: number;
	/** Bounds usados no Tf desta suíte — mesmos para todas (calculados sobre o período inteiro). */
	eficienciaBoundsMs: EfficiencyBoundsMs;
	satisfacaoMedia: number;
	nivelDeUsabilidade: number;
	classificacao: string;
}

/**
 * Alimenta a tabela macro (por suíte) do dashboard, incluindo os números crus
 * (`execucoesComYes`, `eficienciaBoundsMs`, `satisfacaoMedia`) que o painel de
 * detalhamento do cálculo (linha selecionada) usa para reproduzir a fórmula com
 * valores reais — ver `nível-de-usabilidade.ts`/`eficiencia.ts` para o racional de
 * cada fórmula.
 *
 * Os limites `min`/`max` de eficiência são calculados UMA VEZ sobre todas as execuções
 * de suíte do período (não por suíte individual) — é a mesma granularidade que
 * `eficiencia.ts` exige: comparar o tempo de uma suíte contra o menor/maior tempo de
 * suíte já observado, nunca contra tempos de tarefa.
 *
 * Quando uma suíte não tem nenhuma resposta de satisfação no período (sessões ainda em
 * andamento, por exemplo), `Ts` entra como 0 no Nível de Usabilidade em vez de tentar
 * normalizar uma média vazia — o valor fica documentado como incompleto pelo próprio
 * `execucoes: 0`/`satisfacaoMedia: 0` no retorno, não escondido atrás de um fallback.
 */
export async function getSuites(
	repositories: Repositories,
	range: DateRange,
): Promise<SuiteMetrics[]> {
	const protocolVersionId =
		await repositories.protocol.getActiveProtocolVersionId();
	const [suiteDefs, suiteRuns, satisfactionAnswers] = await Promise.all([
		repositories.protocol.getSuiteDefs(protocolVersionId),
		repositories.suiteRuns.findInRange(range),
		repositories.answers.findByQuestionKey(
			protocolVersionId,
			"satisfaction",
			range,
		),
	]);

	const efficiencyBounds = bounds(suiteRuns.map((run) => run.activeMs));
	const runsBySuiteId = groupBy(suiteRuns, (run) => run.suiteId);
	const satisfactionBySuiteId = groupBy(
		satisfactionAnswers.filter((answer) => answer.valueNumber !== null),
		(answer) => answer.suiteId ?? "",
	);

	return suiteDefs.map((suite) => {
		const runs = runsBySuiteId.get(suite.id) ?? [];
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
			(satisfactionBySuiteId.get(suite.id) ?? []).map(
				(a) => a.valueNumber as number,
			),
		);
		const ts = satMedia === 0 ? 0 : satisfacaoTaxa(satMedia);
		const nivel = nivelDeUsabilidade({ te, tf, ts });

		return {
			code: suite.code,
			title: suite.title,
			taskCount: suite.taskCount,
			execucoes: runs.length,
			execucoesComYes: outcomes.filter((outcome) => outcome === "YES").length,
			eficacia: te,
			eficiencia: tf,
			tempoMedioMs: mean(runs.map((run) => run.activeMs)),
			eficienciaBoundsMs: efficiencyBounds,
			satisfacaoMedia: satMedia,
			nivelDeUsabilidade: nivel,
			classificacao: classificar(nivel),
		};
	});
}
