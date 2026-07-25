/**
 * Critério de aceite: `participant_code` é auto-incremento e único, e duas sessões
 * criadas em sequência recebem números consecutivos sem que a aplicação atribua valor.
 *
 * Nenhuma inserção aqui passa `participantCode`. Se algum dia o código da aplicação
 * precisar atribuir esse número, é este teste que deixa de fazer sentido.
 */

import { describe, expect, test } from "bun:test";
import { asc, eq } from "drizzle-orm";

import { insertProtocolFixture, insertSession } from "../testing/fixtures";
import { withEphemeralDatabase } from "../testing/suite";
import { sessions } from "./collection";

describe("numeração do participante", () => {
	const getDb = withEphemeralDatabase();

	test("duas sessões em sequência recebem números consecutivos", async () => {
		const db = getDb();
		const { protocolVersionId } = await insertProtocolFixture(db);

		const firstId = await insertSession(db, protocolVersionId);
		const secondId = await insertSession(db, protocolVersionId);

		const rows = await db
			.select({ id: sessions.id, participantCode: sessions.participantCode })
			.from(sessions)
			.orderBy(asc(sessions.participantCode));

		expect(rows).toHaveLength(2);

		const [before, after] = rows;
		if (!before || !after) throw new Error("esperava duas sessões");

		expect(before.id).toBe(firstId);
		expect(after.id).toBe(secondId);
		expect(after.participantCode).toBe(before.participantCode + 1);
	});

	test("o status começa em IN_PROGRESS sem que a inserção o informe", async () => {
		const db = getDb();
		const { protocolVersionId } = await insertProtocolFixture(db);

		const id = await insertSession(db, protocolVersionId);

		const [row] = await db
			.select({ status: sessions.status })
			.from(sessions)
			.where(eq(sessions.id, id));

		expect(row?.status).toBe("IN_PROGRESS");
	});
});
