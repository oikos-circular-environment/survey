"use client";

import { useQuery } from "@tanstack/react-query";

import { useDateRange } from "@/components/dashboard/date-range-context";
import { DistributionBarChart } from "@/components/dashboard/distribution-bar-chart";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/utils/trpc";

export default function DemographicsPage() {
	const { range } = useDateRange();
	const demographics = useQuery(
		trpc.dashboard.demographics.queryOptions({
			from: range.from,
			to: range.to,
		}),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Caracterização dos participantes"
				description="Screener respondido uma vez, antes de começar"
			/>

			{demographics.data ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<DistributionBarChart
						title="Faixa etária"
						data={demographics.data.ageRange}
					/>
					<DistributionBarChart
						title="Escolaridade"
						data={demographics.data.educationLevel}
					/>
					<DistributionBarChart
						title="Papel na cadeia de resíduos"
						data={demographics.data.chainRole}
					/>
					<DistributionBarChart
						title="Relação com reciclagem e resíduos (1–5)"
						data={demographics.data.wasteContactFrequency}
					/>
					<DistributionBarChart
						title="Experiência com aplicativos (1–5)"
						data={demographics.data.appExperience}
					/>
				</div>
			) : (
				<p className="text-muted-foreground text-sm">Carregando…</p>
			)}
		</div>
	);
}
