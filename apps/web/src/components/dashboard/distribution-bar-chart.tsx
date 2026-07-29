"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@survey/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@survey/ui/components/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface DistributionBucket {
	key: string;
	label: string;
	count: number;
}

const chartConfig = {
	count: { label: "Participantes", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Rótulo curto para o eixo Y — a `label` completa (às vezes uma frase inteira) vai no tooltip. */
function shortLabel(label: string): string {
	const firstClause = label.split(/[—–-]/)[0]?.trim() ?? label;
	return firstClause.length > 28 ? `${firstClause.slice(0, 27)}…` : firstClause;
}

export function DistributionBarChart({
	title,
	data,
}: {
	title: string;
	data: DistributionBucket[];
}) {
	const chartData = data.map((bucket) => ({
		...bucket,
		shortLabel: shortLabel(bucket.label),
	}));
	const height = Math.max(160, chartData.length * 34);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={chartConfig}
					style={{ height }}
					className="w-full"
				>
					<BarChart
						data={chartData}
						layout="vertical"
						margin={{ left: 8, right: 24 }}
					>
						<CartesianGrid horizontal={false} />
						<XAxis
							type="number"
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<YAxis
							type="category"
							dataKey="shortLabel"
							tickLine={false}
							axisLine={false}
							width={130}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									nameKey="count"
									labelFormatter={(_, payload) =>
										payload?.[0]?.payload?.label ?? ""
									}
								/>
							}
						/>
						<Bar dataKey="count" fill="var(--color-count)" radius={4} />
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
