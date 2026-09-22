import { Badge } from "@survey/ui/components/badge";
import { Card, CardContent, CardHeader } from "@survey/ui/components/card";

import {
	formatMinutes,
	formatPercent,
	formatRate,
} from "@/components/dashboard/metric-format";

interface FormulaCardProps {
	label: string;
	formula: string;
	substitution: string;
	result: string;
	accent?: boolean;
}

function FormulaCard({
	label,
	formula,
	substitution,
	result,
	accent,
}: FormulaCardProps) {
	return (
		<div
			className={`flex flex-col gap-2 p-4 ${accent ? "bg-accent" : "bg-muted"}`}
		>
			<p className="font-semibold text-[11px] uppercase tracking-wide">
				{label}
			</p>
			<div className="w-fit bg-card px-2.5 py-1.5">
				<p className="font-mono text-xs">{formula}</p>
			</div>
			<p className="text-muted-foreground text-xs">{substitution}</p>
			<div className="h-px w-full bg-border" />
			<p className="font-semibold text-base">{result}</p>
		</div>
	);
}

export interface SuiteCalculationDetail {
	code: string;
	title: string;
	tarefasRealizadas: number;
	tarefasConcluidas: number;
	eficacia: number | null;
	tarefasCronometradas: number;
	tempoMedioMs: number | null;
	eficienciaBoundsMs: { min: number; max: number };
	eficiencia: number | null;
	sessoesComSatisfacao: number;
	satisfacaoMedia: number | null;
	satisfacao: number | null;
	nivelDeUsabilidade: number | null;
	classificacao: string | null;
}

/**
 * Painel de detalhamento do cálculo — mostra a fórmula e os valores reais usados para
 * chegar no resultado da linha selecionada, no mesmo espírito de Lima, Oliveira &
 * Santana (2013). Espelha o desenho do Pencil (nó gwTYu), reconstruído com dados reais
 * da API em vez de números fixos.
 */
export function CalculationDetailPanel({
	suite,
}: {
	suite: SuiteCalculationDetail;
}) {
	const tmed = suite.tempoMedioMs;
	const tmin = suite.eficienciaBoundsMs.min;
	const tmax = suite.eficienciaBoundsMs.max;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div className="flex flex-col gap-1">
					<h3 className="font-semibold text-base">Detalhamento do cálculo</h3>
					<p className="text-muted-foreground text-xs">
						Linha selecionada: {suite.code} · {suite.title}
					</p>
				</div>
				<Badge variant="secondary">{suite.code} selecionada</Badge>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormulaCard
						label="Eficácia (Te)"
						formula="Te = ΣTARc / ΣTAR"
						substitution={`${suite.tarefasConcluidas} tarefas concluídas (YES) / ${suite.tarefasRealizadas} tarefas realizadas`}
						result={`Te = ${suite.tarefasConcluidas} / ${suite.tarefasRealizadas} = ${formatRate(suite.eficacia)} → ${formatPercent(suite.eficacia)}`}
					/>
					<FormulaCard
						label="Eficiência (Tf)"
						formula="Tf = 1 − tmed / (tmax − tmin)"
						substitution={`tmed = ${formatMinutes(tmed)} min (${suite.tarefasCronometradas} tarefas concluídas de ${suite.code}) · tmin = ${formatMinutes(tmin)} min · tmax = ${formatMinutes(tmax)} min (extremos do período)`}
						result={`Tf = 1 − ${formatMinutes(tmed)}/(${formatMinutes(tmax)}−${formatMinutes(tmin)}) = ${formatRate(suite.eficiencia)}`}
					/>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormulaCard
						label="Satisfação (Ts)"
						formula="Ts = (média − 1) / 4"
						substitution={
							suite.satisfacaoMedia !== null
								? `média = ${formatRate(suite.satisfacaoMedia)} (escala 1–5, pós-suíte, ${suite.sessoesComSatisfacao} sessões)`
								: "sem respostas de satisfação no período selecionado"
						}
						result={
							suite.satisfacaoMedia !== null
								? `Ts = (${formatRate(suite.satisfacaoMedia)} − 1) / 4 = ${formatRate(suite.satisfacao)}`
								: "Ts indisponível (sem dado)"
						}
					/>
					<FormulaCard
						accent
						label="Nível de Usabilidade (Us)"
						formula="Us = (Te + Tf + Ts) / 3"
						substitution={`= (${formatRate(suite.eficacia)} + ${formatRate(suite.eficiencia)} + ${formatRate(suite.satisfacao)}) / 3`}
						result={`= ${formatRate(suite.nivelDeUsabilidade)} → ${suite.classificacao ?? "sem dado"}`}
					/>
				</div>
				<p className="text-muted-foreground text-xs">
					tmin/tmax de eficiência são o menor e o maior tempo entre todas as
					tarefas concluídas do período selecionado (não só desta suíte), por
					isso o mesmo intervalo aparece no cálculo de qualquer suíte.
				</p>
			</CardContent>
		</Card>
	);
}
