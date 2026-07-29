"use client";

import { Badge } from "@survey/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@survey/ui/components/card";
import { useQuery } from "@tanstack/react-query";

import { ClassificationBadge } from "@/components/dashboard/classification-badge";
import { useDateRange } from "@/components/dashboard/date-range-context";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SessionsAreaChart } from "@/components/dashboard/sessions-area-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { trpc } from "@/utils/trpc";

function formatPercent(value: number): string {
	return `${(value * 100).toFixed(0)}%`;
}

function formatRate(value: number): string {
	return value.toFixed(2).replace(".", ",");
}

const STATUS_LABELS: Record<string, string> = {
	IN_PROGRESS: "em andamento",
	COMPLETED: "completas",
	ABANDONED: "abandonadas",
	DISCARDED: "descartadas",
};

export default function OverviewPage() {
	const { range } = useDateRange();
	const overview = useQuery(
		trpc.dashboard.overview.queryOptions({ from: range.from, to: range.to }),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Visão geral"
				description="Pesquisa de usabilidade — protocolo oikos-walkthrough"
			/>

			{overview.data ? (
				<>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<StatTile
							label="Total de sessões"
							value={String(overview.data.stats.totalSessions)}
							subtext={Object.entries(overview.data.stats.porStatus)
								.map(
									([status, count]) =>
										`${count} ${STATUS_LABELS[status] ?? status}`,
								)
								.join(" · ")}
						/>
						<StatTile
							label="Eficácia média"
							value={formatPercent(overview.data.stats.eficaciaMedia)}
							subtext="média das suítes"
						/>
						<StatTile
							label="Eficiência média"
							value={formatRate(overview.data.stats.eficienciaMedia)}
							subtext="média das suítes"
						/>
						<StatTile
							label="Nível de Usabilidade"
							value={formatRate(overview.data.stats.nivelDeUsabilidadeMedio)}
							subtext={`${overview.data.stats.classificacao} · média das suítes`}
						/>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Nível de Usabilidade (Us)</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-3">
							<span className="font-semibold text-3xl">
								{formatRate(overview.data.stats.nivelDeUsabilidadeMedio)}
							</span>
							<ClassificationBadge
								classificacao={overview.data.stats.classificacao}
							/>
							<Badge variant="secondary" className="ml-auto">
								Us = (Eficácia + Eficiência + Satisfação) / 3
							</Badge>
						</CardContent>
					</Card>

					<SessionsAreaChart data={overview.data.sessoesPorDia} />
				</>
			) : (
				<p className="text-muted-foreground text-sm">Carregando métricas…</p>
			)}
		</div>
	);
}
