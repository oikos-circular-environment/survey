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
import { cn } from "@survey/ui/lib/utils";
import { Zap } from "lucide-react";

const OUTCOME_LABELS: Record<string, string> = {
	YES: "Concluída",
	PARTIAL: "Parcial",
	NO: "Não concluída",
};

function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function answerCell(
	run: TesterSuiteRun | undefined,
	questionKey: string,
): string {
	const answer = run?.answers.find((a) => a.questionKey === questionKey);
	if (!answer) return "—";
	if (answer.value !== null) return String(answer.value);
	return answer.valueText?.trim() || "—";
}

/**
 * Detalhe de execução de uma suíte. A matriz cobre todas as suítes da sessão, não só a
 * selecionada: a leitura que interessa é a mesma pergunta comparada entre etapas, e as
 * colunas dobram como navegação — clicar troca a suíte sem fechar o drawer.
 */
export function SuiteExecutionDrawer({
	suiteRuns,
	selectedSuiteRunId,
	onSelect,
	onClose,
}: {
	suiteRuns: TesterSuiteRun[];
	selectedSuiteRunId: string | null;
	onSelect: (suiteRunId: string) => void;
	onClose: () => void;
}) {
	const selected = suiteRuns.find(
		(run) => run.suiteRunId === selectedSuiteRunId,
	);

	const questions = suiteRuns
		.flatMap((run) => run.answers)
		.reduce<{ key: string; label: string; position: number }[]>(
			(acc, answer) => {
				if (acc.some((q) => q.key === answer.questionKey)) return acc;
				acc.push({
					key: answer.questionKey,
					label: answer.questionLabel,
					position: answer.position,
				});
				return acc;
			},
			[],
		)
		.sort((a, b) => a.position - b.position);

	return (
		<Sheet
			open={selectedSuiteRunId !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
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
										<TableHead className="w-28">Desfecho</TableHead>
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
												<span className="flex items-center gap-1.5">
													{task.taskTitle}
													{task.autoDetected ? (
														<Zap
															className="size-3 text-muted-foreground"
															aria-label="detectada por sinal"
														/>
													) : null}
												</span>
											</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{OUTCOME_LABELS[task.outcome ?? ""] ?? "—"}
												</Badge>
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
							<Zap className="mr-1 inline size-3" />
							concluída por sinal automático; sem o ícone, foi resolvida
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
										{suiteRuns.map((run) => (
											<TableHead
												key={run.suiteRunId}
												className={cn(
													"w-16 cursor-pointer text-center",
													run.suiteRunId === selectedSuiteRunId &&
														"bg-muted font-semibold text-foreground",
												)}
												onClick={() => onSelect(run.suiteRunId)}
											>
												{run.suiteCode}
											</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{questions.map((question) => (
										<TableRow key={question.key}>
											<TableCell className="whitespace-normal align-top text-sm">
												{question.label}
											</TableCell>
											{suiteRuns.map((run) => (
												<TableCell
													key={run.suiteRunId}
													className={cn(
														"text-center text-sm",
														run.suiteRunId === selectedSuiteRunId && "bg-muted",
													)}
												>
													{answerCell(run, question.key)}
												</TableCell>
											))}
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
