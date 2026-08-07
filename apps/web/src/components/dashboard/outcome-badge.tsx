import { Badge } from "@survey/ui/components/badge";
import { cn } from "@survey/ui/lib/utils";

export const OUTCOME_LABELS: Record<string, string> = {
	YES: "Concluída",
	PARTIAL: "Parcial",
	NO: "Não concluída",
};

const OUTCOME_STYLES: Record<string, string> = {
	YES: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
	PARTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
	NO: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function OutcomeBadge({ outcome }: { outcome: string | null }) {
	if (!outcome) {
		return (
			<Badge variant="outline" className="border-transparent bg-muted">
				—
			</Badge>
		);
	}

	return (
		<Badge
			variant="outline"
			className={cn("border-transparent", OUTCOME_STYLES[outcome])}
		>
			{OUTCOME_LABELS[outcome] ?? outcome}
		</Badge>
	);
}
