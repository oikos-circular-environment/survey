"use client";

import * as React from "react";

export type DateRangePreset = "1w" | "2w" | "3w" | "1m" | "custom";

export interface DateRangeValue {
	preset: DateRangePreset;
	/** epoch ms, inclusive */
	from: number;
	/** epoch ms, inclusive */
	to: number;
}

interface DateRangeContextValue {
	range: DateRangeValue;
	setPreset: (preset: Exclude<DateRangePreset, "custom">) => void;
	setCustomRange: (from: Date, to: Date) => void;
}

const DateRangeContext = React.createContext<DateRangeContextValue | null>(
	null,
);

function startOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

function endOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(23, 59, 59, 999);
	return copy;
}

function rangeForPreset(
	preset: Exclude<DateRangePreset, "custom">,
): DateRangeValue {
	const now = new Date();
	const to = endOfDay(now);
	const from = new Date(now);
	if (preset === "1w") from.setDate(from.getDate() - 6);
	if (preset === "2w") from.setDate(from.getDate() - 13);
	if (preset === "3w") from.setDate(from.getDate() - 20);
	if (preset === "1m") from.setMonth(from.getMonth() - 1);
	return { preset, from: startOfDay(from).getTime(), to: to.getTime() };
}

/**
 * Filtro de período global do dashboard. Presets ("Última semana", "Últimas 2
 * semanas", "Últimas 3 semanas", "Último mês") e o intervalo customizado são
 * resolvidos aqui, no cliente, para `from`/`to` absolutos em epoch ms — a API
 * (`dateRangeInput`) só entende intervalo absoluto, nunca preset.
 */
export function DateRangeProvider({ children }: { children: React.ReactNode }) {
	const [range, setRange] = React.useState<DateRangeValue>(() =>
		rangeForPreset("1w"),
	);

	const setPreset = React.useCallback(
		(preset: Exclude<DateRangePreset, "custom">) =>
			setRange(rangeForPreset(preset)),
		[],
	);

	const setCustomRange = React.useCallback((from: Date, to: Date) => {
		setRange({
			preset: "custom",
			from: startOfDay(from).getTime(),
			to: endOfDay(to).getTime(),
		});
	}, []);

	const value = React.useMemo(
		() => ({ range, setPreset, setCustomRange }),
		[range, setPreset, setCustomRange],
	);

	return (
		<DateRangeContext.Provider value={value}>
			{children}
		</DateRangeContext.Provider>
	);
}

export function useDateRange(): DateRangeContextValue {
	const context = React.useContext(DateRangeContext);
	if (!context) {
		throw new Error("useDateRange must be used within a <DateRangeProvider />");
	}
	return context;
}
