import { Badge } from "@survey/ui/components/badge";
import { Card, CardContent, CardHeader } from "@survey/ui/components/card";

import { FormulaCard } from "@/components/dashboard/calculation-detail-panel";
import {
	formatMs,
	formatPercent,
	formatRate,
	formatSeconds,
} from "@/components/dashboard/metric-format";

export interface TaskCalculationDetail {
	code: string;
	title: string;
	totalConcluintes: number;
	tentativas: number;
	concluidas: number;
	cronometradas: number;
	eficacia: number | null;
	tempoMedioMs: number | null;
	eficienciaBoundsMs: { min: number; max: number };
	eficiencia: number | null;
}

/**
 * Fórmulas da linha selecionada na tabela de tarefas, com os valores reais, no mesmo
 * espírito do detalhamento por suíte (Lima, Oliveira e Santana, 2013).
 */
export function TaskCalculationPanel({
	task,
}: {
	task: TaskCalculationDetail;
}) {
	const { min, max } = task.eficienciaBoundsMs;
	const somaMs =
		task.tempoMedioMs === null ? null : task.tempoMedioMs * task.cronometradas;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div className="flex flex-col gap-1">
					<h3 className="font-semibold text-base">Detalhamento do cálculo</h3>
					<p className="text-muted-foreground text-xs">
						Linha selecionada: {task.code} · {task.title}
					</p>
				</div>
				<Badge variant="secondary">{task.code} selecionada</Badge>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<FormulaCard
						label="Eficácia (Te)"
						formula="Te = concluíram / iniciaram"
						substitution={`${task.totalConcluintes} testadores concluíram a suíte; ${task.tentativas} iniciaram esta tarefa e ${task.concluidas} a concluíram`}
						result={`Te = ${task.concluidas} / ${task.tentativas} = ${formatRate(task.eficacia)} → ${formatPercent(task.eficacia)}`}
					/>
					<FormulaCard
						label="Eficiência (Tf)"
						formula="Tf = 1 − tméd / (tmáx − tmín)"
						substitution={
							task.tempoMedioMs === null
								? "nenhuma conclusão com tempo medido, então não há tempo médio"
								: `tméd = ${formatSeconds(task.tempoMedioMs)} (desta tarefa) · tmín = ${formatSeconds(min)} e tmáx = ${formatSeconds(max)} (conclusão mais rápida e mais lenta entre todas as tarefas do período)`
						}
						result={
							task.tempoMedioMs === null
								? `Tf = ${formatRate(task.eficiencia)}${task.concluidas === 0 && task.tentativas > 0 ? " (ninguém concluiu)" : ""}`
								: `Tf = 1 − ${formatSeconds(task.tempoMedioMs)} / (${formatSeconds(max)} − ${formatSeconds(min)}) = ${formatRate(task.eficiencia)}`
						}
					/>
					<FormulaCard
						label="Tempo médio (tméd)"
						formula="tméd = soma dos tempos / conclusões cronometradas"
						substitution={
							somaMs === null
								? "sem conclusões com tempo medido"
								: `${task.cronometradas} conclusões cronometradas somam ${formatSeconds(somaMs)} de tempo ativo (pausas não contam)`
						}
						result={
							somaMs === null
								? "tméd indisponível"
								: `tméd = ${formatSeconds(somaMs)} / ${task.cronometradas} = ${formatSeconds(task.tempoMedioMs)} → ${formatMs(task.tempoMedioMs)} min`
						}
					/>
				</div>
				<p className="text-muted-foreground text-xs">
					Quanto mais perto de 1, mais o tempo médio desta tarefa se aproxima da
					conclusão mais rápida do estudo; perto de 0, da mais lenta. tmín e
					tmáx são os mesmos para todas as tarefas, o que permite comparar uma
					com a outra.
				</p>
			</CardContent>
		</Card>
	);
}
