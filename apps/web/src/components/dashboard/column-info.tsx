"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@survey/ui/components/tooltip";
import { cn } from "@survey/ui/lib/utils";
import { Info } from "lucide-react";

/** Rótulo de coluna com ícone de informação que explica o dado ao passar o mouse. */
export function ColumnInfo({
	label,
	info,
	align = "left",
}: {
	label: string;
	info: string;
	align?: "left" | "right";
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1",
				align === "right" && "justify-end",
			)}
		>
			{label}
			<Tooltip>
				<TooltipTrigger
					aria-label={`O que é ${label}`}
					className="inline-flex text-muted-foreground hover:text-foreground"
				>
					<Info className="size-3.5" />
				</TooltipTrigger>
				<TooltipContent className="max-w-xs whitespace-normal text-left">
					{info}
				</TooltipContent>
			</Tooltip>
		</span>
	);
}
