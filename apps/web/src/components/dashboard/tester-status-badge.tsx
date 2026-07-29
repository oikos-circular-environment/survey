import { Badge } from "@survey/ui/components/badge";
import { cn } from "@survey/ui/lib/utils";

const STATUS_LABELS: Record<string, string> = {
	IN_PROGRESS: "Em andamento",
	COMPLETED: "Completa",
	ABANDONED: "Abandonada",
	DISCARDED: "Descartada",
};

const STATUS_STYLES: Record<string, string> = {
	IN_PROGRESS:
		"bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
	COMPLETED:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
	ABANDONED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
	DISCARDED: "bg-muted text-muted-foreground",
};

export function TesterStatusBadge({ status }: { status: string }) {
	return (
		<Badge
			variant="outline"
			className={cn("border-transparent", STATUS_STYLES[status])}
		>
			{STATUS_LABELS[status] ?? status}
		</Badge>
	);
}
