"use client";

import { Badge } from "@survey/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@survey/ui/components/card";
import { useQuery } from "@tanstack/react-query";

import { useDateRange } from "@/components/dashboard/date-range-context";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { PersonaSwatch } from "@/components/dashboard/persona-swatch";
import { trpc } from "@/utils/trpc";

function formatMs(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function SuitePersonasPage() {
	const { range } = useDateRange();
	const suitePersonas = useQuery(
		trpc.dashboard.suitePersonas.queryOptions({
			from: range.from,
			to: range.to,
		}),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Suíte → personas"
				description="Para cada suíte, quantos testadores de cada persona a executaram e o tempo médio. S1/S2 são as únicas comuns às 5 personas."
			/>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{suitePersonas.data?.map((suite) => (
					<Card key={suite.suiteCode}>
						<CardHeader>
							<div className="flex items-center gap-2">
								<Badge variant="outline">{suite.suiteCode}</Badge>
								<CardTitle className="text-base">{suite.suiteTitle}</CardTitle>
							</div>
							<CardDescription>
								{suite.personas.length} persona
								{suite.personas.length === 1 ? "" : "s"}{" "}
								{suite.personas.length === 1 ? "testou" : "testaram"} esta suíte
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							{suite.personas.map((persona) => (
								<div
									key={persona.personaKey}
									className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
								>
									<span className="font-medium">
										<PersonaSwatch
											personaKey={persona.personaKey}
											label={persona.personaLabel}
										/>
									</span>
									<span className="text-muted-foreground">
										{persona.testadores} testador
										{persona.testadores === 1 ? "" : "es"} ·{" "}
										{formatMs(persona.tempoMedioMs)}
									</span>
								</div>
							))}
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
