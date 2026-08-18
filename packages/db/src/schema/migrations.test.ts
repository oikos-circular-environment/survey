/**
 * Critério de aceite: a migração gerada aplica de banco vazio sem erro.
 *
 * O harness já aplica as migrações no `beforeAll`, então uma falha de migração derruba
 * a suíte antes de qualquer expectativa rodar. O que sobra para verificar aqui é que o
 * resultado tem a forma esperada — as doze tabelas, e não onze.
 */

import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { firstRow, rowsOf } from "../testing/queries";
import { withEphemeralDatabase } from "../testing/suite";

const expectedTables = [
	"usability_answers",
	"usability_deleted_testers",
	"usability_events",
	"usability_persona_defs",
	"usability_persona_suites",
	"usability_protocol_versions",
	"usability_questions",
	"usability_sessions",
	"usability_suite_defs",
	"usability_suite_runs",
	"usability_task_defs",
	"usability_task_runs",
];

describe("migração inicial", () => {
	const getDb = withEphemeralDatabase();

	test("cria as doze tabelas usability_*", async () => {
		const rows = await getDb().execute<{ table_name: string }>(sql`
			SELECT TABLE_NAME AS table_name
			FROM information_schema.TABLES
			WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'usability_%'
			ORDER BY TABLE_NAME
		`);

		const names = rowsOf<{ table_name: string }>(rows).map(
			(row) => row.table_name,
		);

		expect(names).toEqual(expectedTables);
	});

	/**
	 * O MySQL recusa identificador com mais de 64 caracteres, e o nome que o Drizzle
	 * monta sozinho para uma chave estrangeira concatena quatro nomes — com o prefixo
	 * `usability_`, estoura. Isso já quebrou uma vez; o teste existe para que quebre no
	 * momento em que a tabela é escrita, e não depois de subir a migração.
	 */
	test("nenhum identificador do banco passa de 64 caracteres", async () => {
		const rows = await getDb().execute<{ name: string }>(sql`
			SELECT CONSTRAINT_NAME AS name
			FROM information_schema.TABLE_CONSTRAINTS
			WHERE CONSTRAINT_SCHEMA = DATABASE()
			UNION
			SELECT INDEX_NAME AS name
			FROM information_schema.STATISTICS
			WHERE TABLE_SCHEMA = DATABASE()
			UNION
			SELECT TABLE_NAME AS name
			FROM information_schema.TABLES
			WHERE TABLE_SCHEMA = DATABASE()
		`);

		const tooLong = rowsOf<{ name: string }>(rows)
			.map((row) => row.name)
			.filter((name) => name.length > 64);

		expect(tooLong).toEqual([]);
	});

	/**
	 * `participant_code` trocou de `int autoincrement` para `char(26)` (ULID,
	 * atribuído pela aplicação — ver S05). Este teste substitui o antigo, que
	 * verificava o auto-incremento; agora verifica exatamente o oposto.
	 */
	test("participant_code é char(26) e não é auto-incremento", async () => {
		const rows = await getDb().execute<{
			extra: string;
			columnType: string;
		}>(sql`
			SELECT EXTRA AS extra, COLUMN_TYPE AS columnType
			FROM information_schema.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = 'usability_sessions'
				AND COLUMN_NAME = 'participant_code'
		`);

		const row = firstRow<{ extra: string; columnType: string }>(rows);
		expect(row?.extra).not.toContain("auto_increment");
		expect(row?.columnType).toBe("char(26)");
	});
});
