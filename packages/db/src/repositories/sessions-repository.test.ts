import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { deletedTesters } from "../schema/audit";
import {
	answers,
	events,
	sessions,
	suiteRuns,
	taskRuns,
} from "../schema/collection";
import { insertProtocolFixture, insertSession } from "../testing/fixtures";
import { rowCount } from "../testing/queries";
import { withEphemeralDatabase } from "../testing/suite";
import { SessionsRepository } from "./sessions-repository";

describe("SessionsRepository.hardDelete", () => {
	const getDb = withEphemeralDatabase();

	test("apaga a sessão em cascata e grava o snapshot em deletedTesters", async () => {
		const db = getDb();
		const repository = new SessionsRepository(db);
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

		await repository.hardDelete(sessionId, "admin-user-1");

		expect(await rowCount(db, sessions)).toBe(0);
		expect(await rowCount(db, suiteRuns)).toBe(0);
		expect(await rowCount(db, taskRuns)).toBe(0);
		expect(await rowCount(db, events)).toBe(0);
		expect(await rowCount(db, answers)).toBe(0);

		const [snapshot] = await db
			.select()
			.from(deletedTesters)
			.where(eq(deletedTesters.sessionId, sessionId));

		expect(snapshot?.deletedByUserId).toBe("admin-user-1");
		expect(snapshot?.persona).toBe("CITIZEN");
		expect(snapshot?.cityName).toBe("São Paulo");
	});

	test("lança erro quando a sessão não existe", async () => {
		const db = getDb();
		const repository = new SessionsRepository(db);

		await expect(
			repository.hardDelete(randomUUID(), "admin-user-1"),
		).rejects.toThrow();
	});
});

describe("SessionsRepository.findDeletedInRange", () => {
	const getDb = withEphemeralDatabase();

	test("só devolve testadores apagados com início dentro do período", async () => {
		const db = getDb();
		const repository = new SessionsRepository(db);
		const fixture = await insertProtocolFixture(db);

		const insideId = await insertSession(db, fixture.protocolVersionId, {
			startedAt: new Date("2026-01-15T00:00:00Z"),
		});
		const outsideId = await insertSession(db, fixture.protocolVersionId, {
			startedAt: new Date("2025-01-15T00:00:00Z"),
		});

		await repository.hardDelete(insideId, "admin-user-1");
		await repository.hardDelete(outsideId, "admin-user-1");

		const rows = await repository.findDeletedInRange({
			from: new Date("2026-01-01T00:00:00Z").getTime(),
			to: new Date("2026-01-31T00:00:00Z").getTime(),
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.sessionId).toBe(insideId);
	});
});
