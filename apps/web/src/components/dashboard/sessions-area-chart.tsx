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
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
	PERSONA_COLORS,
	PERSONA_LABELS,
	PERSONA_ORDER,
} from "./persona-labels";

interface SessionStart {
	persona: string;
	startedAt: string;
}

const DAY_KEY = "yyyy-MM-dd";

const chartConfig = PERSONA_ORDER.reduce((config, key) => {
	config[key] = {
		label: PERSONA_LABELS[key],
		color: PERSONA_COLORS[key],
	};
	return config;
}, {} as ChartConfig) satisfies ChartConfig;

/**
 * Uma linha por dia corrido, no fuso do navegador, do primeiro ao último dia com
 * sessão. Dias sem sessão entram com zero para a curva não sugerir sessões que não
 * aconteceram entre duas datas distantes.
 */
function sessionsPerDay(sessions: SessionStart[]) {
	if (sessions.length === 0) return [];

	const counts = new Map<string, Record<string, number>>();
	const days = sessions.map((session) =>
		startOfDay(new Date(session.startedAt)),
	);
	for (const [index, session] of sessions.entries()) {
		const key = format(days[index] as Date, DAY_KEY);
		const byPersona = counts.get(key) ?? {};
		byPersona[session.persona] = (byPersona[session.persona] ?? 0) + 1;
		counts.set(key, byPersona);
	}

	const first = new Date(Math.min(...days.map((day) => day.getTime())));
	const last = new Date(Math.max(...days.map((day) => day.getTime())));
	const rows = [];
	for (let day = first; day <= last; day = addDays(day, 1)) {
		const key = format(day, DAY_KEY);
		const byPersona = counts.get(key) ?? {};
		rows.push({
			date: key,
			...Object.fromEntries(
				PERSONA_ORDER.map((persona) => [persona, byPersona[persona] ?? 0]),
			),
		});
	}
	return rows;
}

export function SessionsAreaChart({ sessions }: { sessions: SessionStart[] }) {
	const chartData = sessionsPerDay(sessions);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Sessões ao longo do tempo</CardTitle>
				<CardDescription>
					Sessões concluídas por dia e por persona, no período selecionado
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[280px] w-full"
				>
					<AreaChart data={chartData} margin={{ left: 0, right: 12 }}>
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
										stopOpacity={0.35}
									/>
									<stop
										offset="95%"
										stopColor={`var(--color-${key})`}
										stopOpacity={0.02}
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
								format(parseISO(value), "d MMM", { locale: ptBR })
							}
						/>
						<YAxis
							allowDecimals={false}
							domain={[0, "auto"]}
							tickLine={false}
							axisLine={false}
							width={32}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(value) =>
										typeof value === "string"
											? format(parseISO(value), "d 'de' MMMM, yyyy", {
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
								type="linear"
								fill={`url(#fill-${key})`}
								stroke={`var(--color-${key})`}
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
							/>
						))}
						<ChartLegend content={<ChartLegendContent />} />
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
