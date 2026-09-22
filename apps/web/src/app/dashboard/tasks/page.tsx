"use client";

import { Badge } from "@survey/ui/components/badge";
import { Button } from "@survey/ui/components/button";
import { Card, CardContent } from "@survey/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@survey/ui/components/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@survey/ui/components/table";
import { cn } from "@survey/ui/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import * as React from "react";

import { ColumnInfo } from "@/components/dashboard/column-info";
import { useDateRange } from "@/components/dashboard/date-range-context";
import {
	formatMs,
	formatPercent,
	formatRate,
} from "@/components/dashboard/metric-format";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { TaskCalculationPanel } from "@/components/dashboard/task-calculation-panel";
import { trpc } from "@/utils/trpc";

const PAGE_SIZE = 20;

interface TaskRow {
	code: string;
	title: string;
	suiteCode: string;
	totalConcluintes: number;
	tentativas: number;
	concluidas: number;
	eficacia: number | null;
	tempoMedioMs: number | null;
	eficiencia: number | null;
}

function toCsv(rows: TaskRow[]): string {
	const header =
		"Código,Título,Suíte,Total concluintes,Iniciaram,Concluíram,Eficácia,Tempo médio (ms),Eficiência";
	const lines = rows.map((r) =>
		[
			r.code,
			`"${r.title.replace(/"/g, '""')}"`,
			r.suiteCode,
			r.totalConcluintes,
			r.tentativas,
			r.concluidas,
			r.eficacia ?? "",
			r.tempoMedioMs ?? "",
			r.eficiencia ?? "",
		].join(","),
	);
	return [header, ...lines].join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export default function TasksPage() {
	const { range } = useDateRange();
	const [page, setPage] = React.useState(1);
	const [selectedCode, setSelectedCode] = React.useState<string | null>(null);

	const tasks = useQuery({
		...trpc.dashboard.tasks.queryOptions({
			from: range.from,
			to: range.to,
			page,
			pageSize: PAGE_SIZE,
		}),
		placeholderData: keepPreviousData,
	});

	const selectedTask = tasks.data?.items.find(
		(task) => task.code === selectedCode,
	);

	const totalPages = tasks.data
		? Math.max(1, Math.ceil(tasks.data.total / PAGE_SIZE))
		: 1;

	function handleExport(format: "csv" | "json") {
		if (!tasks.data) return;
		if (format === "csv") {
			downloadFile(toCsv(tasks.data.items), "tarefas.csv", "text/csv");
		} else {
			downloadFile(
				JSON.stringify(tasks.data.items, null, 2),
				"tarefas.json",
				"application/json",
			);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Tarefas"
				description="Uma linha por tarefa, só sessões concluídas. Eficácia = participantes que concluíram / que iniciaram; tempo médio e eficiência consideram só as conclusões."
				actions={
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="gap-2">
								<Download className="size-4" />
								Exportar
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => handleExport("csv")}>
								Exportar como CSV
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleExport("json")}>
								Exportar como JSON
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				}
			/>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Título</TableHead>
								<TableHead>
									<ColumnInfo
										label="Suíte"
										info="Etapa do protocolo à qual a tarefa pertence. Na versão atual existe uma única suíte (S1), comum a todas as personas."
									/>
								</TableHead>
								<TableHead className="text-right">
									<ColumnInfo
										align="right"
										label="Total concluintes"
										info="Testadores que concluíram a suíte da tarefa no período. Só sessões com status concluída entram na tabela."
									/>
								</TableHead>
								<TableHead className="text-right">
									<ColumnInfo
										align="right"
										label="Iniciaram"
										info="Dos concluintes, quantos começaram esta tarefa. Fica abaixo do total quando a tarefa não fazia parte do roteiro de algum testador."
									/>
								</TableHead>
								<TableHead className="text-right">
									<ColumnInfo
										align="right"
										label="Concluíram"
										info="Dos que iniciaram, quantos tiveram o sinal de sucesso da tarefa registrado pelo app. Os demais pularam a tarefa ou avançaram sem concluir."
									/>
								</TableHead>
								<TableHead className="text-right">
									<ColumnInfo
										align="right"
										label="Eficácia"
										info="Concluíram dividido por iniciaram (Lima et al., 2013). 100% significa que todos que iniciaram concluíram a tarefa."
									/>
								</TableHead>
								<TableHead className="text-right">
									<ColumnInfo
										align="right"
										label="Eficiência"
										info="1 − tempo médio ÷ (tempo mais lento − tempo mais rápido), com os extremos de todas as tarefas concluídas do período. Perto de 1: o tempo médio está próximo da conclusão mais rápida; perto de 0, da mais lenta."
									/>
								</TableHead>
								<TableHead className="text-right">
									<ColumnInfo
										align="right"
										label="Tempo médio"
										info="Média do tempo ativo das conclusões, em minutos e segundos (0:21 = 21 segundos). Pausas não contam."
									/>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tasks.data?.items.map((task) => (
								<TableRow
									key={`${task.suiteCode}-${task.code}`}
									onClick={() =>
										setSelectedCode((current) =>
											current === task.code ? null : task.code,
										)
									}
									className={cn(
										"cursor-pointer",
										selectedCode === task.code && "bg-accent",
									)}
								>
									<TableCell>{task.code}</TableCell>
									<TableCell className="font-medium">{task.title}</TableCell>
									<TableCell>
										<Badge variant="outline">{task.suiteCode}</Badge>
									</TableCell>
									<TableCell className="text-right">
										{task.totalConcluintes}
									</TableCell>
									<TableCell className="text-right">
										{task.tentativas}
									</TableCell>
									<TableCell className="text-right">
										{task.concluidas}
									</TableCell>
									<TableCell className="text-right">
										{formatPercent(task.eficacia)}
									</TableCell>
									<TableCell className="text-right">
										{formatRate(task.eficiencia)}
									</TableCell>
									<TableCell className="text-right">
										{formatMs(task.tempoMedioMs)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{selectedTask ? <TaskCalculationPanel task={selectedTask} /> : null}

			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					Mostrando {tasks.data ? (page - 1) * PAGE_SIZE + 1 : 0}–
					{tasks.data ? Math.min(page * PAGE_SIZE, tasks.data.total) : 0} de{" "}
					{tasks.data?.total ?? 0}
				</p>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
					>
						Anterior
					</Button>
					<span className="text-muted-foreground text-sm">
						{page} / {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
					>
						Próximo
					</Button>
				</div>
			</div>
		</div>
	);
}
