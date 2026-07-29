import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import { sessions, suiteRuns, taskRuns } from "../schema/collection";
import type * as schema from "../schema/index";
import { type DateRange, dateRangeFilter } from "./date-range";

type Db = MySql2Database<typeof schema>;

export interface TaskRunRow {
	taskId: string;
	suiteRunId: string;
	suiteId: string;
	outcome: "YES" | "PARTIAL" | "NO" | null;
	activeMs: number;
}

/** Acesso de leitura a `usability_task_runs`. */
export class TaskRunsRepository {
	constructor(private readonly db: Db) {}

	/** Todas as execuções de tarefa no período, com o id da suíte-mãe embutido. */
	async findInRange(range: DateRange): Promise<TaskRunRow[]> {
		return this.db
			.select({
				taskId: taskRuns.taskId,
				suiteRunId: taskRuns.suiteRunId,
				suiteId: suiteRuns.suiteId,
				outcome: taskRuns.outcome,
				activeMs: taskRuns.activeMs,
			})
			.from(taskRuns)
			.innerJoin(suiteRuns, eq(taskRuns.suiteRunId, suiteRuns.id))
			.innerJoin(sessions, eq(suiteRuns.sessionId, sessions.id))
			.where(dateRangeFilter(sessions.startedAt, range));
	}
}
