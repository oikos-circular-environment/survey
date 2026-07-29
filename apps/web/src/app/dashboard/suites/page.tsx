"use client";

import { Badge } from "@survey/ui/components/badge";
import { Card, CardContent } from "@survey/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@survey/ui/components/table";
import { useQuery } from "@tanstack/react-query";

import { ClassificationBadge } from "@/components/dashboard/classification-badge";
import { useDateRange } from "@/components/dashboard/date-range-context";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/utils/trpc";

function formatMs(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatPercent(value: number): string {
	return `${(value * 100).toFixed(0)}%`;
}

function formatRate(value: number): string {
	return value.toFixed(2).replace(".", ",");
}

export default function SuitesPage() {
	const { range } = useDateRange();
	const suites = useQuery(
		trpc.dashboard.suites.queryOptions({ from: range.from, to: range.to }),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Registro macro — por suíte (ISO 9241-11)"
				description="Uma linha por etapa. Eficácia conta só outcome YES — PARTIAL entra como não concluído."
			/>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Título</TableHead>
								<TableHead className="text-right">Tarefas</TableHead>
								<TableHead className="text-right">Execuções</TableHead>
								<TableHead className="text-right">Eficácia</TableHead>
								<TableHead className="text-right">Eficiência</TableHead>
								<TableHead className="text-right">Tempo médio</TableHead>
								<TableHead className="text-right">Satisfação</TableHead>
								<TableHead className="text-right">Us</TableHead>
								<TableHead>Classificação</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{suites.data?.map((suite) => (
								<TableRow key={suite.code}>
									<TableCell>
										<Badge variant="outline">{suite.code}</Badge>
									</TableCell>
									<TableCell className="font-medium">{suite.title}</TableCell>
									<TableCell className="text-right">
										{suite.taskCount}
									</TableCell>
									<TableCell className="text-right">
										{suite.execucoes}
									</TableCell>
									<TableCell className="text-right">
										{formatPercent(suite.eficacia)}
									</TableCell>
									<TableCell className="text-right">
										{formatRate(suite.eficiencia)}
									</TableCell>
									<TableCell className="text-right">
										{formatMs(suite.tempoMedioMs)}
									</TableCell>
									<TableCell className="text-right">
										{suite.satisfacaoMedia > 0
											? `${formatRate(suite.satisfacaoMedia)} / 5`
											: "—"}
									</TableCell>
									<TableCell className="text-right">
										{formatRate(suite.nivelDeUsabilidade)}
									</TableCell>
									<TableCell>
										<ClassificationBadge classificacao={suite.classificacao} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
