import { Badge } from "@survey/ui/components/badge";
import { cn } from "@survey/ui/lib/utils";

const CLASSIFICATION_STYLES: Record<string, string> = {
	Péssimo: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
	Satisfatório:
		"bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
	Bom: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
	Ótimo:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function ClassificationBadge({
	classificacao,
}: {
	classificacao: string | null;
}) {
	if (classificacao === null) {
		return <span className="text-muted-foreground">—</span>;
	}
	return (
		<Badge
			variant="outline"
			className={cn("border-transparent", CLASSIFICATION_STYLES[classificacao])}
		>
			{classificacao}
		</Badge>
	);
}
