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

import { useDateRange } from "@/components/dashboard/date-range-context";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { TesterDetailPanel } from "@/components/dashboard/tester-detail-panel";
import { TesterStatusBadge } from "@/components/dashboard/tester-status-badge";
import { trpc } from "@/utils/trpc";

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function participantCodeLabel(participantCode: number): string {
	return `PSQ-${String(participantCode).padStart(4, "0")}`;
}

export default function TestersPage() {
	const { range } = useDateRange();
	const testers = useQuery(
		trpc.dashboard.testers.queryOptions({ from: range.from, to: range.to }),
	);
	const [selectedSessionId, setSelectedSessionId] = React.useState<
		string | null
	>(null);

	const testerDetail = useQuery({
		...trpc.dashboard.testerDetail.queryOptions({
			sessionId: selectedSessionId ?? "",
		}),
		enabled: selectedSessionId !== null,
	});

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Testadores"
				description="Uma linha por sessão. Selecione uma linha para ver todos os dados do testador — screener, aparelho e execução por suíte."
			/>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Persona</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Início</TableHead>
								<TableHead>Cidade/UF</TableHead>
								<TableHead>Faixa etária</TableHead>
								<TableHead>Escolaridade</TableHead>
								<TableHead>Aparelho</TableHead>
								<TableHead className="text-right">Tempo ativo</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{testers.data?.map((tester) => (
								<TableRow
									key={tester.sessionId}
									onClick={() =>
										setSelectedSessionId((current) =>
											current === tester.sessionId ? null : tester.sessionId,
										)
									}
									className={cn(
										"cursor-pointer",
										selectedSessionId === tester.sessionId && "bg-accent",
									)}
								>
									<TableCell>
										<Badge variant="outline">
											{participantCodeLabel(tester.participantCode)}
										</Badge>
									</TableCell>
									<TableCell className="font-medium">
										{tester.persona}
									</TableCell>
									<TableCell>
										<TesterStatusBadge status={tester.status} />
									</TableCell>
									<TableCell>{formatDate(tester.startedAt)}</TableCell>
									<TableCell>
										{tester.cityName} / {tester.stateUf}
									</TableCell>
									<TableCell>{tester.ageRange}</TableCell>
									<TableCell>{tester.educationLevel}</TableCell>
									<TableCell>{tester.deviceOs}</TableCell>
									<TableCell className="text-right">
										{formatDuration(tester.activeMs)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{testerDetail.data ? (
				<TesterDetailPanel tester={testerDetail.data} />
			) : (
				<p className="text-muted-foreground text-sm">
					Selecione uma linha da tabela para ver todos os dados do testador.
				</p>
			)}
		</div>
	);
}
