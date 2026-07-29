import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import { sessions, suiteRuns } from "../schema/collection";
import type * as schema from "../schema/index";
import { type DateRange, dateRangeFilter } from "./date-range";

type Db = MySql2Database<typeof schema>;

export interface SuiteRunRow {
	suiteId: string;
	sessionId: string;
	persona: string;
	outcome: "YES" | "PARTIAL" | "NO" | null;
	activeMs: number;
}

export interface SuiteRunOfSessionRow {
	suiteId: string;
	position: number;
	outcome: "YES" | "PARTIAL" | "NO" | null;
	activeMs: number;
	wallMs: number;
	startedAt: Date;
	finishedAt: Date | null;
}

/** Acesso de leitura a `usability_suite_runs`. */
export class SuiteRunsRepository {
	constructor(private readonly db: Db) {}

	/** Todas as execuções de suíte no período, com a persona da sessão embutida. */
	async findInRange(range: DateRange): Promise<SuiteRunRow[]> {
		return this.db
			.select({
				suiteId: suiteRuns.suiteId,
				sessionId: suiteRuns.sessionId,
				persona: sessions.persona,
				outcome: suiteRuns.outcome,
				activeMs: suiteRuns.activeMs,
			})
			.from(suiteRuns)
			.innerJoin(sessions, eq(suiteRuns.sessionId, sessions.id))
			.where(dateRangeFilter(sessions.startedAt, range));
	}

	/** Execuções de suíte de UMA sessão específica, na ordem em que aconteceram. */
	async findBySessionId(sessionId: string): Promise<SuiteRunOfSessionRow[]> {
		return this.db
			.select({
				suiteId: suiteRuns.suiteId,
				position: suiteRuns.position,
				outcome: suiteRuns.outcome,
				activeMs: suiteRuns.activeMs,
				wallMs: suiteRuns.wallMs,
				startedAt: suiteRuns.startedAt,
				finishedAt: suiteRuns.finishedAt,
			})
			.from(suiteRuns)
			.where(eq(suiteRuns.sessionId, sessionId))
			.orderBy(suiteRuns.position);
	}
}
