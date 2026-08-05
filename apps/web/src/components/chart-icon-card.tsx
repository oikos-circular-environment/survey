import { cn } from "@survey/ui/lib/utils";
import type { LucideIcon } from "lucide-react";

export function ChartIconCard({
	icon: Icon,
	size = "default",
	className,
}: {
	icon: LucideIcon;
	size?: "default" | "sm";
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center rounded-md bg-[#0a0a0a] dark:bg-muted",
				size === "sm" ? "size-7" : "size-9",
				className,
			)}
		>
			<Icon
				className={cn("text-primary", size === "sm" ? "size-4" : "size-5")}
			/>
		</div>
	);
}
