"use client";

import type { TesterSuiteRun } from "@oikos-circular-environment/survey-api/use-cases/get-tester-detail";
import { Badge } from "@survey/ui/components/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@survey/ui/components/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@survey/ui/components/table";
import { Zap } from "lucide-react";

import { OUTCOME_LABELS, OutcomeBadge } from "./outcome-badge";

function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatClock(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function answerCell(answer: TesterSuiteRun["answers"][number]): string {
	if (answer.value !== null) return String(answer.value);
	return answer.valueText?.trim() || "—";
}

/**
 * Detalhe de execução de uma suíte. O drawer exibe apenas os dados da suíte
 * selecionada: tarefas e respostas pós-etapa pertencem exclusivamente a ela.
 */
export function SuiteExecutionDrawer({
	suiteRuns,
	selectedSuiteRunId,
	onClose,
	abandonReason,
}: {
	suiteRuns: TesterSuiteRun[];
	selectedSuiteRunId: string | null;
	onClose: () => void;
	abandonReason: string | null;
}) {
	const selected = suiteRuns.find(
		(run) => run.suiteRunId === selectedSuiteRunId,
	);

	const questions = (selected?.answers ?? [])
		.slice()
		.sort((a, b) => a.position - b.position);

	return (
		<Sheet
			open={selectedSuiteRunId !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<SheetContent className="w-full overflow-y-auto data-[side=right]:sm:w-[30vw] data-[side=right]:sm:max-w-[30vw]">
				<SheetHeader>
					<SheetTitle>
						{selected ? `${selected.suiteCode} · ${selected.suiteTitle}` : ""}
					</SheetTitle>
					<SheetDescription>
						{selected
							? `${OUTCOME_LABELS[selected.outcome ?? ""] ?? "Sem desfecho"} · ${formatDuration(selected.activeMs)} ativos de ${formatDuration(selected.wallMs)} totais`
							: ""}
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-6 p-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="bg-muted p-3">
							<p className="text-muted-foreground text-xs">Início</p>
							<p className="font-medium text-sm">
								{formatClock(selected?.startedAt ?? null)}
							</p>
						</div>
						<div className="bg-muted p-3">
							<p className="text-muted-foreground text-xs">Fim</p>
							<p className="font-medium text-sm">
								{formatClock(selected?.finishedAt ?? null)}
							</p>
						</div>
					</div>

					{abandonReason ? (
						<div className="bg-muted p-3">
							<p className="text-muted-foreground text-xs">
								Motivo do abandono da pesquisa
							</p>
							<p className="text-sm">“{abandonReason}”</p>
						</div>
					) : null}

					<div>
						<p className="mb-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
							Tarefas
						</p>
						{selected && selected.tasks.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-14">Cód.</TableHead>
										<TableHead>Tarefa</TableHead>
										<TableHead className="w-12 text-center">Sinal</TableHead>
										<TableHead className="w-28">Desfecho</TableHead>
										<TableHead className="w-20">Início</TableHead>
										<TableHead className="w-20">Fim</TableHead>
										<TableHead className="w-20 text-right">Tempo</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{selected.tasks.map((task) => (
										<TableRow key={task.taskCode}>
											<TableCell>
												<Badge variant="outline">{task.taskCode}</Badge>
											</TableCell>
											<TableCell className="whitespace-normal align-top text-sm">
												{task.taskTitle}
											</TableCell>
											<TableCell className="text-center align-top">
												{task.autoDetected ? (
													<Zap
														className="inline size-3.5 text-muted-foreground"
														aria-label="concluída por sinal automático"
													/>
												) : (
													<span className="sr-only">resolvida manualmente</span>
												)}
											</TableCell>
											<TableCell>
												<OutcomeBadge outcome={task.outcome} />
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{formatClock(task.startedAt)}
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{formatClock(task.finishedAt)}
											</TableCell>
											<TableCell className="text-right text-muted-foreground text-xs">
												{formatDuration(task.activeMs)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<p className="text-muted-foreground text-sm">
								Nenhuma tarefa registrada nesta etapa.
							</p>
						)}
						<p className="mt-2 text-[11px] text-muted-foreground">
							Sinal: <Zap className="mx-1 inline size-3" />
							concluída por sinal automático; coluna vazia, resolvida
							manualmente.
						</p>
					</div>

					{questions.length > 0 ? (
						<div>
							<p className="mb-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
								Respostas pós-etapa
							</p>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Pergunta</TableHead>
										<TableHead>Resposta</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{questions.map((answer) => (
										<TableRow key={answer.questionKey}>
											<TableCell className="whitespace-normal align-top text-sm">
												{answer.questionLabel}
											</TableCell>
											<TableCell className="text-sm">
												{answerCell(answer)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}
