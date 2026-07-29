/**
 * Critério de aceite (S09/A9): nenhuma migração cria chave estrangeira entre as
 * tabelas do Better Auth (`user`, `session`, `account`, `verification`) e as tabelas
 * `usability_*` — em nenhuma das duas direções. É a fronteira que permite exportar ou
 * apagar o conjunto inteiro da pesquisa sem tocar em autenticação.
 */

import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { rowsOf } from "../testing/queries";
import { withEphemeralDatabase } from "../testing/suite";

const AUTH_TABLES = ["user", "session", "account", "verification"];
const authTableList = sql.join(
	AUTH_TABLES.map((name) => sql`${name}`),
	sql.raw(", "),
);

describe("fronteira entre Better Auth e usability_*", () => {
	const getDb = withEphemeralDatabase();

	test("nenhuma chave estrangeira cruza a fronteira, em nenhuma direção", async () => {
		const rows = await getDb().execute<{
			table_name: string;
			referenced_table_name: string;
		}>(sql`
			SELECT TABLE_NAME AS table_name, REFERENCED_TABLE_NAME AS referenced_table_name
			FROM information_schema.KEY_COLUMN_USAGE
			WHERE TABLE_SCHEMA = DATABASE()
				AND REFERENCED_TABLE_NAME IS NOT NULL
				AND (
					(TABLE_NAME IN (${authTableList}) AND REFERENCED_TABLE_NAME LIKE 'usability\\_%')
					OR (TABLE_NAME LIKE 'usability\\_%' AND REFERENCED_TABLE_NAME IN (${authTableList}))
				)
		`);

		expect(rowsOf(rows)).toEqual([]);
	});
});
