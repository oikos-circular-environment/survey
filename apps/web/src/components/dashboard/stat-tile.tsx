import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@survey/ui/components/card";

export function StatTile({
	label,
	value,
	subtext,
}: {
	label: string;
	value: string;
	subtext?: string;
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="font-normal text-muted-foreground text-sm">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="font-semibold text-2xl">{value}</div>
				{subtext ? (
					<p className="mt-1 text-muted-foreground text-xs">{subtext}</p>
				) : null}
			</CardContent>
		</Card>
	);
}
