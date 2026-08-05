"use client";

import { cn } from "@survey/ui/lib/utils";

import { ChartIconCard } from "@/components/chart-icon-card";
import { useChartIcon } from "@/components/chart-icon-provider";

export function Logo({ className }: { className?: string }) {
	const Icon = useChartIcon();

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<ChartIconCard icon={Icon} size="sm" />
			<span className="font-heading font-semibold text-lg">Survey</span>
		</div>
	);
}
