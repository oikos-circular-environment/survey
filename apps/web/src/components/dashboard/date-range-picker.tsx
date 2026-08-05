"use client";

import { Button } from "@survey/ui/components/button";
import { Calendar } from "@survey/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@survey/ui/components/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { type DateRangePreset, useDateRange } from "./date-range-context";

const PRESET_LABELS: Record<Exclude<DateRangePreset, "custom">, string> = {
	"1w": "Última semana",
	"2w": "Últimas 2 semanas",
	"3w": "Últimas 3 semanas",
	"1m": "Último mês",
};

export function DateRangePicker() {
	const { range, setPreset, setCustomRange } = useDateRange();
	const [open, setOpen] = React.useState(false);
	const [showCalendar, setShowCalendar] = React.useState(false);
	const [draft, setDraft] = React.useState<DateRange | undefined>({
		from: new Date(range.from),
		to: new Date(range.to),
	});

	const label =
		range.preset === "custom"
			? `${format(range.from, "d MMM", { locale: ptBR })} – ${format(range.to, "d MMM, yyyy", { locale: ptBR })}`
			: PRESET_LABELS[range.preset];

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setShowCalendar(false);
			}}
		>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						className="w-[220px] justify-start gap-2 font-normal"
					/>
				}
			>
				<CalendarIcon className="size-4 text-muted-foreground" />
				{label}
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="end">
				<div className="flex flex-col divide-y">
					<div className="flex flex-col p-1">
						{(
							Object.keys(PRESET_LABELS) as Array<
								Exclude<DateRangePreset, "custom">
							>
						).map((preset) => (
							<Button
								key={preset}
								variant={range.preset === preset ? "secondary" : "ghost"}
								className="justify-start font-normal"
								onClick={() => {
									setPreset(preset);
									setOpen(false);
								}}
							>
								{PRESET_LABELS[preset]}
							</Button>
						))}
						<Button
							variant={range.preset === "custom" ? "secondary" : "ghost"}
							className="justify-start font-normal"
							onClick={() => {
								setDraft({
									from: new Date(range.from),
									to: new Date(range.to),
								});
								setShowCalendar(true);
							}}
						>
							Personalizado
						</Button>
					</div>
					{showCalendar && (
						<div className="p-2">
							<Calendar
								mode="range"
								numberOfMonths={2}
								showOutsideDays={false}
								selected={draft}
								onSelect={setDraft}
								defaultMonth={draft?.from}
								locale={ptBR}
							/>
							<div className="flex justify-end p-2 pt-0">
								<Button
									size="sm"
									disabled={!draft?.from || !draft?.to}
									onClick={() => {
										if (draft?.from && draft?.to) {
											setCustomRange(draft.from, draft.to);
											setOpen(false);
										}
									}}
								>
									Aplicar período personalizado
								</Button>
							</div>
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
