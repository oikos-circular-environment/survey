/**
 * Consultas de apoio aos testes.
 */

import { count } from "drizzle-orm";
import type { MySqlTable } from "drizzle-orm/mysql-core";

import type { TestDatabase } from "./harness";

export async function rowCount(
	db: TestDatabase,
	table: MySqlTable,
): Promise<number> {
	const [row] = await db.select({ value: count() }).from(table);

	return row?.value ?? 0;
}

/**
 * Extrai as linhas de um `db.execute(...)`.
 *
 * O driver mysql2 devolve `[linhas, metadados]`, e o tipo que o Drizzle declara para
 * esse par descreve o caso de escrita — daí o parâmetro `unknown`. Concentrar o desvio
 * aqui evita que cada teste de consulta crua repita o mesmo cast.
 */
export function rowsOf<T>(result: unknown): T[] {
	const [rows] = result as [T[], unknown];

	return rows;
}

export function firstRow<T>(result: unknown): T | undefined {
	return rowsOf<T>(result)[0];
}
