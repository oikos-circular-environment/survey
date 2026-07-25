/**
 * Critério de aceite: apagar uma sessão apaga em cascata suas execuções, eventos e
 * respostas, e não toca em nenhuma tabela de protocolo.
 *
 * É o que sustenta o pedido de exclusão pelo código do participante: uma operação, e
 * não um roteiro de limpeza que alguém precisa lembrar de manter em dia. A metade
 * negativa importa tanto quanto a positiva — se a cascata subisse até o protocolo,
 * apagar um participante apagaria o instrumento das outras sessões.
 */

import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { insertProtocolFixture, insertSession } from "../testing/fixtures";
import { rowCount } from "../testing/queries";
import { withEphemeralDatabase } from "../testing/suite";
import { answers, events, sessions, suiteRuns, taskRuns } from "./collection";
import {
	personaDefs,
	personaSuites,
	protocolVersions,
	questions,
	suiteDefs,
	taskDefs,
} from "./protocol";

describe("exclusão de sessão", () => {
	const getDb = withEphemeralDatabase();

	test("leva junto execuções, eventos e respostas, e preserva o protocolo", async () => {
		const db = getDb();
		const fixture = await insertProtocolFixture(db);
		const sessionId = await insertSession(db, fixture.protocolVersionId);

		const suiteRunId = randomUUID();
		const now = new Date();

		await db.insert(suiteRuns).values({
			id: suiteRunId,
			sessionId,
			suiteId: fixture.suiteId,
			position: 1,
			startedAt: now,
		});

		await db.insert(taskRuns).values({
			id: randomUUID(),
			suiteRunId,
			taskId: fixture.taskId,
			position: 1,
			startedAt: now,
		});

		await db.insert(events).values({
			id: randomUUID(),
			sessionId,
			clientEventId: randomUUID(),
			seq: 1,
			type: "screen.enter",
			occurredAt: now,
			payload: { route: "/reports/map" },
		});

		await db.insert(answers).values({
			id: randomUUID(),
			sessionId,
			suiteRunId,
			questionId: fixture.questionId,
			valueNumber: 5,
		});

		// Pré-condição: sem isto, um teste que apaga o nada passaria em silêncio.
		expect(await rowCount(db, suiteRuns)).toBe(1);
		expect(await rowCount(db, taskRuns)).toBe(1);
		expect(await rowCount(db, events)).toBe(1);
		expect(await rowCount(db, answers)).toBe(1);

		await db.delete(sessions).where(eq(sessions.id, sessionId));

		expect(await rowCount(db, sessions)).toBe(0);
		expect(await rowCount(db, suiteRuns)).toBe(0);
		// task_runs pende de suite_runs, não da sessão: a cascata precisa de dois saltos
		expect(await rowCount(db, taskRuns)).toBe(0);
		expect(await rowCount(db, events)).toBe(0);
		expect(await rowCount(db, answers)).toBe(0);

		expect(await rowCount(db, protocolVersions)).toBe(1);
		expect(await rowCount(db, personaDefs)).toBe(1);
		expect(await rowCount(db, personaSuites)).toBe(1);
		expect(await rowCount(db, suiteDefs)).toBe(1);
		expect(await rowCount(db, taskDefs)).toBe(1);
		expect(await rowCount(db, questions)).toBe(1);
	});
});
