"use client";

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
import { PersonaSwatch } from "@/components/dashboard/persona-swatch";
import { trpc } from "@/utils/trpc";

function formatPercent(value: number): string {
	return `${(value * 100).toFixed(0)}%`;
}

function formatRate(value: number): string {
	return value.toFixed(2).replace(".", ",");
}

export default function PersonasPage() {
	const { range } = useDateRange();
	const personas = useQuery(
		trpc.dashboard.personas.queryOptions({ from: range.from, to: range.to }),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Comparação entre personas"
				description="Todas as métricas agregadas por perfil de participante"
			/>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Persona</TableHead>
								<TableHead className="text-right">Participantes</TableHead>
								<TableHead className="text-right">Eficácia</TableHead>
								<TableHead className="text-right">Eficiência</TableHead>
								<TableHead className="text-right">Satisfação</TableHead>
								<TableHead className="text-right">Us</TableHead>
								<TableHead>Classificação</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{personas.data?.map((persona) => (
								<TableRow key={persona.key}>
									<TableCell className="font-medium">
										<PersonaSwatch
											personaKey={persona.key}
											label={persona.label}
										/>
									</TableCell>
									<TableCell className="text-right">
										{persona.participantes}
									</TableCell>
									<TableCell className="text-right">
										{formatPercent(persona.eficacia)}
									</TableCell>
									<TableCell className="text-right">
										{formatRate(persona.eficiencia)}
									</TableCell>
									<TableCell className="text-right">
										{persona.satisfacaoMedia > 0
											? `${formatRate(persona.satisfacaoMedia)} / 5`
											: "—"}
									</TableCell>
									<TableCell className="text-right">
										{formatRate(persona.nivelDeUsabilidade)}
									</TableCell>
									<TableCell>
										<ClassificationBadge
											classificacao={persona.classificacao}
										/>
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
