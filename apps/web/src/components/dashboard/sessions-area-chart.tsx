"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@survey/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@survey/ui/components/chart";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
	PERSONA_COLORS,
	PERSONA_LABELS,
	PERSONA_ORDER,
} from "./persona-labels";

interface SessionsPerDay {
	date: string;
	porPersona: Record<string, number>;
}

const chartConfig = PERSONA_ORDER.reduce((config, key) => {
	config[key] = {
		label: PERSONA_LABELS[key],
		color: PERSONA_COLORS[key],
	};
	return config;
}, {} as ChartConfig) satisfies ChartConfig;

export function SessionsAreaChart({ data }: { data: SessionsPerDay[] }) {
	const chartData = data.map((day) => ({
		date: day.date,
		...Object.fromEntries(
			PERSONA_ORDER.map((key) => [key, day.porPersona[key] ?? 0]),
		),
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Sessões ao longo do tempo</CardTitle>
				<CardDescription>
					Total de sessões por dia, no período selecionado
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[280px] w-full"
				>
					<AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
						<defs>
							{PERSONA_ORDER.map((key) => (
								<linearGradient
									key={key}
									id={`fill-${key}`}
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="5%"
										stopColor={`var(--color-${key})`}
										stopOpacity={0.7}
									/>
									<stop
										offset="95%"
										stopColor={`var(--color-${key})`}
										stopOpacity={0.05}
									/>
								</linearGradient>
							))}
						</defs>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={(value: string) =>
								format(new Date(value), "d MMM", { locale: ptBR })
							}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(value) =>
										typeof value === "string"
											? format(new Date(value), "d 'de' MMMM, yyyy", {
													locale: ptBR,
												})
											: value
									}
								/>
							}
						/>
						{PERSONA_ORDER.map((key) => (
							<Area
								key={key}
								dataKey={key}
								type="natural"
								fill={`url(#fill-${key})`}
								stroke={`var(--color-${key})`}
								stackId="personas"
							/>
						))}
						<ChartLegend content={<ChartLegendContent />} />
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
