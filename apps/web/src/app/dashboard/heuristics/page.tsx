"use client";

import type { HeuristicResult } from "@oikos-circular-environment/survey-api/use-cases/get-heuristics";
import { Badge } from "@survey/ui/components/badge";
import { Card, CardContent, CardHeader } from "@survey/ui/components/card";
import { Progress } from "@survey/ui/components/progress";
import { useQuery } from "@tanstack/react-query";

import { useDateRange } from "@/components/dashboard/date-range-context";
import { LikertScale } from "@/components/dashboard/likert-scale";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/utils/trpc";

function formatRate(value: number): string {
	return value.toFixed(2).replace(".", ",");
}

function HeuristicCard({ heuristic }: { heuristic: HeuristicResult }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<h3 className="font-semibold text-sm">
					{heuristic.id} — {heuristic.name}
				</h3>
				<Badge variant={heuristic.measured ? "default" : "secondary"}>
					{heuristic.measured ? "Medida" : "Não medida"}
				</Badge>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{!heuristic.measured && (
					<p className="text-muted-foreground text-sm">{heuristic.reason}</p>
				)}

				{heuristic.measured &&
					heuristic.id === "H5" &&
					"prevencao" in heuristic && (
						<>
							<div className="flex flex-col gap-1.5">
								<span className="text-muted-foreground text-xs">
									Sem erro (prevenção)
								</span>
								<span className="font-semibold text-xl">
									{heuristic.prevencao.semErro} de {heuristic.prevencao.total} ={" "}
									{(heuristic.prevencao.percentual * 100).toFixed(1)}%
								</span>
								<Progress value={heuristic.prevencao.percentual * 100} />
							</div>
							<div className="flex flex-col gap-1.5 border-t pt-3">
								<span className="text-muted-foreground text-xs">
									Quando houve erro ({heuristic.recuperacao.n} suítes com
									error_occurred = Sim)
								</span>
								<span className="font-semibold text-base">
									Recuperação avaliada em{" "}
									{formatRate(heuristic.recuperacao.mediaBruta)} / 5
								</span>
								<LikertScale value={heuristic.recuperacao.mediaBruta} />
							</div>
						</>
					)}

				{heuristic.measured &&
					heuristic.id !== "H5" &&
					"mediaBruta" in heuristic && (
						<>
							<span className="text-muted-foreground text-xs">
								Média bruta ({heuristic.n} respostas)
							</span>
							<span className="font-semibold text-2xl">
								{formatRate(heuristic.mediaBruta)} / 5
							</span>
							<LikertScale value={heuristic.mediaBruta} />
						</>
					)}
			</CardContent>
		</Card>
	);
}

export default function HeuristicsPage() {
	const { range } = useDateRange();
	const heuristics = useQuery(
		trpc.dashboard.heuristics.queryOptions({ from: range.from, to: range.to }),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Heurísticas de Nielsen"
				description="7 por pergunta direta (1–5) + 1 por medição objetiva combinada (H5) + 1 reaproveitando eficiência (H7, não medida aqui). H10 não é medida nesta versão."
			/>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{heuristics.data?.map((heuristic) => (
					<HeuristicCard key={heuristic.id} heuristic={heuristic} />
				))}
			</div>
		</div>
	);
}
