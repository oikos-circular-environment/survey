import type { MySql2Database } from "drizzle-orm/mysql2";

import type * as schema from "../schema";
import { answers, events, sessions, suiteRuns, taskRuns } from "../schema";
import type { FactorySession } from "./session-factory";

type Db = MySql2Database<typeof schema>;

export interface InsertedFactorySession {
	sessionId: string;
}

/** Grava uma `FactorySession` já construída em memória, numa única transação. */
export async function insertFactorySession(
	db: Db,
	factory: FactorySession,
): Promise<InsertedFactorySession> {
	await db.transaction(async (tx) => {
		await tx.insert(sessions).values(factory.session);
		if (factory.suiteRuns.length > 0)
			await tx.insert(suiteRuns).values(factory.suiteRuns);
		if (factory.taskRuns.length > 0)
			await tx.insert(taskRuns).values(factory.taskRuns);
		if (factory.events.length > 0)
			await tx.insert(events).values(factory.events);
		if (factory.answers.length > 0)
			await tx.insert(answers).values(factory.answers);
	});

	return { sessionId: factory.session.id };
}
