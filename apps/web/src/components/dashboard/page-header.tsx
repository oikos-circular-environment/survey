import { DateRangePicker } from "./date-range-picker";

export function DashboardPageHeader({
	title,
	description,
	actions,
}: {
	title: string;
	description?: string;
	actions?: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="flex flex-col gap-1">
				<h1 className="font-heading font-semibold text-2xl">{title}</h1>
				{description ? (
					<p className="text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			<div className="flex items-center gap-2">
				{actions}
				<DateRangePicker />
			</div>
		</div>
	);
}
