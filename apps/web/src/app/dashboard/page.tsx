"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@survey/ui/components/card";
import { useQuery } from "@tanstack/react-query";

import { ClassificationBadge } from "@/components/dashboard/classification-badge";
import { useDateRange } from "@/components/dashboard/date-range-context";
import {
	formatPercent,
	formatRate,
} from "@/components/dashboard/metric-format";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SessionsAreaChart } from "@/components/dashboard/sessions-area-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { UsabilityScaleBar } from "@/components/dashboard/usability-scale-bar";
import { trpc } from "@/utils/trpc";

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
							label="Eficácia (Te)"
							value={formatPercent(overview.data.stats.eficacia)}
							subtext={`${overview.data.stats.tarefasConcluidas} de ${overview.data.stats.tarefasRealizadas} tarefas concluídas`}
						/>
						<StatTile
							label="Eficiência (Tf)"
							value={formatRate(overview.data.stats.eficiencia)}
							subtext={`${overview.data.stats.tarefasCronometradas} tarefas concluídas cronometradas`}
						/>
						<StatTile
							label="Nível de Usabilidade"
							value={formatRate(overview.data.stats.nivelDeUsabilidade)}
							subtext={`${overview.data.stats.classificacao ?? "sem dado"} · ${overview.data.stats.sessoesConcluidas} sessões concluídas`}
						/>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Nível de Usabilidade (Us)</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="flex items-center gap-3">
								<span className="font-semibold text-3xl">
									{formatRate(overview.data.stats.nivelDeUsabilidade)}
								</span>
								<ClassificationBadge
									classificacao={overview.data.stats.classificacao}
								/>
							</div>

							<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
								<div className="bg-muted p-3">
									<p className="text-muted-foreground text-xs">Eficácia (Te)</p>
									<p className="font-semibold text-lg">
										{formatRate(overview.data.stats.eficacia)}
									</p>
								</div>
								<div className="bg-muted p-3">
									<p className="text-muted-foreground text-xs">
										Eficiência (Tf)
									</p>
									<p className="font-semibold text-lg">
										{formatRate(overview.data.stats.eficiencia)}
									</p>
								</div>
								<div className="bg-muted p-3">
									<p className="text-muted-foreground text-xs">
										Satisfação (Ts)
									</p>
									<p className="font-semibold text-lg">
										{formatRate(overview.data.stats.satisfacao)}
									</p>
								</div>
							</div>

							<p className="text-muted-foreground text-sm">
								Nível de Usabilidade = (Te + Tf + Ts) / 3 = (
								{formatRate(overview.data.stats.eficacia)} +{" "}
								{formatRate(overview.data.stats.eficiencia)} +{" "}
								{formatRate(overview.data.stats.satisfacao)}) / 3 ={" "}
								{formatRate(overview.data.stats.nivelDeUsabilidade)}
							</p>

							{overview.data.stats.nivelDeUsabilidade !== null ? (
								<UsabilityScaleBar
									value={overview.data.stats.nivelDeUsabilidade}
								/>
							) : null}
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
