const EMPTY = "—";

export function formatPercent(value: number | null): string {
	return value === null ? EMPTY : `${(value * 100).toFixed(0)}%`;
}

export function formatRate(value: number | null): string {
	return value === null ? EMPTY : value.toFixed(2).replace(".", ",");
}

export function formatMinutes(ms: number | null): string {
	return ms === null ? EMPTY : (ms / 60_000).toFixed(2).replace(".", ",");
}

export function formatMs(ms: number | null): string {
	if (ms === null) return EMPTY;
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatSeconds(ms: number | null): string {
	return ms === null ? EMPTY : `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

export function formatSatisfaction(value: number | null): string {
	return value === null ? EMPTY : `${formatRate(value)} / 5`;
}
