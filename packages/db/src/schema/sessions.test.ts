/**
 * Critério de aceite: `participant_code` é único por sessão e não é atribuído pelo
 * banco — é a aplicação quem gera o ULID antes de gravar (ver
 * `SessionsRepository.upsertHeader`, S05). Este arquivo cobre só a garantia de schema
 * (unicidade); a atribuição em si é testada em `repositories/sessions-repository.test.ts`.
 */

import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";

import { insertProtocolFixture, insertSession } from "../testing/fixtures";
import { withEphemeralDatabase } from "../testing/suite";
import { sessions } from "./collection";

describe("unicidade do participant_code", () => {
	const getDb = withEphemeralDatabase();

	test("duas sessões distintas recebem participant_code distintos", async () => {
		const db = getDb();
		const { protocolVersionId } = await insertProtocolFixture(db);

		const firstId = await insertSession(db, protocolVersionId);
		const secondId = await insertSession(db, protocolVersionId);

		const rows = await db
			.select({ id: sessions.id, participantCode: sessions.participantCode })
			.from(sessions);

		expect(rows).toHaveLength(2);
		const first = rows.find((row) => row.id === firstId);
		const second = rows.find((row) => row.id === secondId);
		expect(first?.participantCode).toBeDefined();
		expect(second?.participantCode).toBeDefined();
		expect(first?.participantCode).not.toBe(second?.participantCode);
	});

	test("a coluna recusa participant_code repetido entre sessões", async () => {
		const db = getDb();
		const { protocolVersionId } = await insertProtocolFixture(db);

		const sharedCode = ulid();
		await insertSession(db, protocolVersionId, {
			participantCode: sharedCode,
		});

		await expect(
			insertSession(db, protocolVersionId, { participantCode: sharedCode }),
		).rejects.toThrow();
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
