"use client";

import { Card, CardContent, CardHeader } from "@survey/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";

import { useDateRange } from "@/components/dashboard/date-range-context";
import {
	LikertMetric,
	pluralizeResponses,
} from "@/components/dashboard/likert-metric";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/utils/trpc";

export default function DomainItemsPage() {
	const { range } = useDateRange();
	const domainItems = useQuery(
		trpc.dashboard.domainItems.queryOptions({ from: range.from, to: range.to }),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Itens de domínio"
				description="Valor percebido — escala de concordância (1–5)."
			/>

			<div className="flex items-center gap-2 rounded-md bg-secondary p-3 text-secondary-foreground text-sm">
				<Info className="size-4 shrink-0" />
				Não são heurísticas de Nielsen — medem utilidade percebida no
				ecossistema de economia circular, não usabilidade da interface.
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{domainItems.data?.map((item) => (
					<Card key={item.key}>
						<CardHeader>
							<h3 className="font-semibold text-sm">{item.label}</h3>
						</CardHeader>
						<CardContent>
							<LikertMetric
								caption={`Média bruta (${pluralizeResponses(item.n)})`}
								value={item.mediaBruta}
							/>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
