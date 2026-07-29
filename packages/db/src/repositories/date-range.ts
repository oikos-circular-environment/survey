import { and, gte, lte } from "drizzle-orm";
import type { MySqlColumn } from "drizzle-orm/mysql-core";

/** Intervalo de datas opcional, em epoch milliseconds. `undefined` = sem limite naquele lado. */
export interface DateRange {
	from?: number;
	to?: number;
}

/**
 * Traduz um `DateRange` (epoch ms, o que o filtro de período global do dashboard manda)
 * para uma cláusula `where` sobre a coluna de timestamp informada — normalmente
 * `sessions.startedAt`, o campo que ancora todo filtro de período do dashboard.
 * Compartilhada por todos os repositórios para que "período" signifique sempre a mesma
 * coisa em qualquer tela.
 */
export function dateRangeFilter(column: MySqlColumn, range: DateRange) {
	return and(
		range.from === undefined ? undefined : gte(column, new Date(range.from)),
		range.to === undefined ? undefined : lte(column, new Date(range.to)),
	);
}
