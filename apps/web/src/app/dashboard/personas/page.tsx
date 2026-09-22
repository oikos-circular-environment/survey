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
import {
	formatPercent,
	formatRate,
	formatSatisfaction,
} from "@/components/dashboard/metric-format";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { PersonaSwatch } from "@/components/dashboard/persona-swatch";
import { trpc } from "@/utils/trpc";

export default function PersonasPage() {
	const { range } = useDateRange();
	const personas = useQuery(
		trpc.dashboard.personas.queryOptions({ from: range.from, to: range.to }),
	);

	return (
		<div className="flex flex-col gap-6">
			<DashboardPageHeader
				title="Comparação entre personas"
				description="Métricas por perfil de participante, só sessões concluídas. Eficácia e eficiência vêm das tarefas; satisfação, do questionário pós-suíte."
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
										{persona.tarefasRealizadas > 0 ? (
											<span className="ml-1 text-muted-foreground text-xs">
												({persona.tarefasConcluidas}/{persona.tarefasRealizadas}
												)
											</span>
										) : null}
									</TableCell>
									<TableCell className="text-right">
										{formatRate(persona.eficiencia)}
									</TableCell>
									<TableCell className="text-right">
										{formatSatisfaction(persona.satisfacaoMedia)}
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
