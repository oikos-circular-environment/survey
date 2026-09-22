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
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import * as React from "react";

import { useDateRange } from "@/components/dashboard/date-range-context";
import {
	formatMinutes,
	formatPercent,
	formatRate,
} from "@/components/dashboard/metric-format";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/utils/trpc";

const PAGE_SIZE = 20;

interface TaskRow {
	code: string;
	title: string;
	suiteCode: string;
	tentativas: number;
	concluidas: number;
	eficacia: number | null;
	tempoMedioMs: number | null;
	eficiencia: number | null;
}

function toCsv(rows: TaskRow[]): string {
	const header =
		"Código,Título,Suíte,Realizaram,Concluíram,Eficácia,Tempo médio (ms),Eficiência";
	const lines = rows.map((r) =>
		[
			r.code,
			`"${r.title.replace(/"/g, '""')}"`,
			r.suiteCode,
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

	const tasks = useQuery({
		...trpc.dashboard.tasks.queryOptions({
			from: range.from,
			to: range.to,
			page,
			pageSize: PAGE_SIZE,
		}),
		placeholderData: keepPreviousData,
	});

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
				description="Uma linha por tarefa, só sessões concluídas. Eficácia = participantes que concluíram / que realizaram; tempo médio e eficiência consideram só as conclusões."
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
								<TableHead>Suíte</TableHead>
								<TableHead className="text-right">Realizaram</TableHead>
								<TableHead className="text-right">Concluíram</TableHead>
								<TableHead className="text-right">Eficácia</TableHead>
								<TableHead className="text-right">Tempo médio (min)</TableHead>
								<TableHead className="text-right">Eficiência</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tasks.data?.items.map((task) => (
								<TableRow key={`${task.suiteCode}-${task.code}`}>
									<TableCell>{task.code}</TableCell>
									<TableCell className="font-medium">{task.title}</TableCell>
									<TableCell>
										<Badge variant="outline">{task.suiteCode}</Badge>
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
										{formatMinutes(task.tempoMedioMs)}
									</TableCell>
									<TableCell className="text-right">
										{formatRate(task.eficiencia)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

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
