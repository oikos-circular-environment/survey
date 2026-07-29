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
}
