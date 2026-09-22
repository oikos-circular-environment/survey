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
import { cn } from "@survey/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { CalculationDetailPanel } from "@/components/dashboard/calculation-detail-panel";
import { ClassificationBadge } from "@/components/dashboard/classification-badge";
import { useDateRange } from "@/components/dashboard/date-range-context";
import {
	formatMs,
	formatPercent,
	formatRate,
	formatSatisfaction,
} from "@/components/dashboard/metric-format";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/utils/trpc";

export default function SuitesPage() {
	const { range } = useDateRange();
	const suites = useQuery(
		trpc.dashboard.suites.queryOptions({ from: range.from, to: range.to }),
	);
	const [selectedCode, setSelectedCode] = React.useState<string | null>(null);

	const selectedSuite = suites.data?.find(
		(suite) => suite.code === selectedCode,
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Registro macro, por suíte (ISO 9241-11)"
				description="Uma linha por etapa, só sessões concluídas. Eficácia e eficiência vêm das tarefas da etapa; satisfação, do questionário pós-suíte. Selecione uma linha para ver o detalhamento do cálculo."
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
								<TableRow
									key={suite.code}
									onClick={() =>
										setSelectedCode((current) =>
											current === suite.code ? null : suite.code,
										)
									}
									className={cn(
										"cursor-pointer",
										selectedCode === suite.code && "bg-accent",
									)}
								>
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
										{formatSatisfaction(suite.satisfacaoMedia)}
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

			{selectedSuite ? (
				<CalculationDetailPanel suite={selectedSuite} />
			) : (
				<p className="text-muted-foreground text-sm">
					Selecione uma linha da tabela para ver o detalhamento do cálculo.
				</p>
			)}
		</div>
	);
}
