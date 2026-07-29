/**
 * Regressão das duas armadilhas documentadas em `columns.ts`.
 *
 * Ambas passaram despercebidas na primeira escrita do schema e nenhuma das duas
 * aparece como erro no dia a dia: a primeira grava dado errado calado, a segunda só
 * quebra na hora de aplicar a migração num banco vazio.
 */

import { describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { insertProtocolFixture, insertSession } from "../testing/fixtures";
import { firstRow, rowsOf } from "../testing/queries";
import { withEphemeralDatabase } from "../testing/suite";
import { sessions } from "./collection";

describe("precisão de tempo", () => {
	const getDb = withEphemeralDatabase();

	// Só usability_*: as tabelas do Better Auth (`schema/auth.ts`) são geradas pelo CLI
	// dele e usam `defaultNow()` sem precisão — não é uma convenção deste pacote para
	// tunar, é regenerada a cada `db:auth:generate` (ver a nota no topo do arquivo).
	test("os padrões usam now(3), e não now()", async () => {
		const rows = await getDb().execute<{
			column_name: string;
			column_default: string | null;
		}>(sql`
			SELECT COLUMN_NAME AS column_name, COLUMN_DEFAULT AS column_default
			FROM information_schema.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME LIKE 'usability\\_%'
				AND DATA_TYPE = 'timestamp'
				AND COLUMN_DEFAULT IS NOT NULL
		`);

		const defaults = rowsOf<{
			column_name: string;
			column_default: string | null;
		}>(rows);

		// Sem isto, um schema que perdesse todos os padrões passaria no filtro abaixo.
		expect(defaults.length).toBeGreaterThan(0);

		for (const column of defaults) {
			// `now()` sem argumento devolve precisão de segundo e zera os milissegundos
			// da coluna, silenciosamente.
			expect(column.column_default?.toLowerCase()).toContain("now(3)");
		}
	});

	/**
	 * O Drizzle lê uma coluna `timestamp` interpretando a string do servidor como UTC.
	 * Se a sessão não estiver em UTC, o servidor devolve o valor já convertido para o
	 * fuso dele e o instante fica deslocado — sem erro, sem aviso. O contêiner local é
	 * UTC por acaso; este teste garante que a aplicação não dependa desse acaso.
	 */
	test("a conexão fixa a sessão em UTC", async () => {
		const rows = await getDb().execute<{ zone: string }>(sql`
			SELECT @@session.time_zone AS zone
		`);

		// Compara com o literal, e não com o deslocamento: um servidor que já roda em
		// UTC — como o contêiner de desenvolvimento — daria deslocamento zero mesmo sem
		// o `SET`, e o teste passaria sem provar nada. `SYSTEM` aqui significa que a
		// conexão herdou o fuso do servidor, que é justamente o que não pode acontecer.
		expect(firstRow<{ zone: string }>(rows)?.zone).toBe("+00:00");
	});

	test("uma coluna de tempo devolve os milissegundos que recebeu", async () => {
		const db = getDb();
		const { protocolVersionId } = await insertProtocolFixture(db);

		const withMillis = new Date("2026-07-25T12:34:56.789Z");
		const id = await insertSession(db, protocolVersionId, {
			startedAt: withMillis,
		});

		const [row] = await db
			.select({ startedAt: sessions.startedAt })
			.from(sessions)
			.where(eq(sessions.id, id));

		expect(row?.startedAt.toISOString()).toBe(withMillis.toISOString());
	});

	test("updated_at avança quando a linha muda", async () => {
		const db = getDb();
		const { protocolVersionId } = await insertProtocolFixture(db);
		const id = await insertSession(db, protocolVersionId);

		const [before] = await db
			.select({ updatedAt: sessions.updatedAt })
			.from(sessions)
			.where(eq(sessions.id, id));

		// O ORM carimba o momento da escrita; sem a espera, as duas podem cair no mesmo
		// milissegundo e o teste passaria sem provar nada.
		await Bun.sleep(5);

		await db
			.update(sessions)
			.set({ status: "COMPLETED" })
			.where(eq(sessions.id, id));

		const [after] = await db
			.select({ updatedAt: sessions.updatedAt })
			.from(sessions)
			.where(eq(sessions.id, id));

		if (!before || !after) throw new Error("esperava encontrar a sessão");

		expect(after.updatedAt.getTime()).toBeGreaterThan(
			before.updatedAt.getTime(),
		);
	});
});
