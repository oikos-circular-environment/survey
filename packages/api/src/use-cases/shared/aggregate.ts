/** Agrupa itens por uma chave derivada — utilitário genérico usado por vários use-cases. */
export function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
	const map = new Map<K, T[]>();
	for (const item of items) {
		const k = key(item);
		const list = map.get(k) ?? [];
		list.push(item);
		map.set(k, list);
	}
	return map;
}

/** Média aritmética simples; array vazio dá 0 em vez de `NaN`. */
export function mean(values: ReadonlyArray<number>): number {
	if (values.length === 0) return 0;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Menor e maior valor de uma lista; array vazio dá `{min: 0, max: 0}`. */
export function bounds(values: ReadonlyArray<number>): {
	min: number;
	max: number;
} {
	if (values.length === 0) return { min: 0, max: 0 };
	return { min: Math.min(...values), max: Math.max(...values) };
}
