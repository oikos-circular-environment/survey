"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@survey/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";

import { useDateRange } from "@/components/dashboard/date-range-context";
import { LikertScale } from "@/components/dashboard/likert-scale";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/utils/trpc";

function formatRate(value: number): string {
	return value.toFixed(2).replace(".", ",");
}

export default function DomainItemsPage() {
	const { range } = useDateRange();
	const domainItems = useQuery(
		trpc.dashboard.domainItems.queryOptions({ from: range.from, to: range.to }),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader title="Itens de domínio" />

			<div className="flex items-center gap-2 rounded-md bg-secondary p-3 text-secondary-foreground text-sm">
				<Info className="size-4 shrink-0" />
				Não são heurísticas de Nielsen — medem utilidade percebida no
				ecossistema de economia circular, não usabilidade da interface.
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						Valor percebido — escala de concordância (1–5)
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					{domainItems.data?.map((item) => (
						<div key={item.key} className="flex flex-col gap-1.5">
							<span className="font-medium text-sm">{item.label}</span>
							<span className="text-muted-foreground text-xs">
								Média bruta: {formatRate(item.mediaBruta)} / 5 ({item.n}{" "}
								respostas)
							</span>
							<LikertScale value={item.mediaBruta} />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
