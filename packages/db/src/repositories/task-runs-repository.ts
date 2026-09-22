import { and, eq, inArray, isNotNull } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import { sessions, suiteRuns, taskRuns } from "../schema/collection";
import type * as schema from "../schema/index";
import { taskDefs } from "../schema/protocol";
import { type DateRange, dateRangeFilter } from "./date-range";
import { completedSessionsOf } from "./study-scope";

type Db = MySql2Database<typeof schema>;

export interface TaskRunRow {
	taskId: string;
	suiteRunId: string;
	suiteId: string;
	sessionId: string;
	persona: string;
	outcome: "YES" | "PARTIAL" | "NO" | null;
	activeMs: number;
}

export interface SuiteTaskRunRow {
	suiteRunId: string;
	taskCode: string;
	taskTitle: string;
	position: number;
	outcome: "YES" | "PARTIAL" | "NO" | null;
	activeMs: number;
	autoDetected: boolean;
	startedAt: Date;
	finishedAt: Date | null;
}

/** Acesso de leitura a `usability_task_runs`. */
export class TaskRunsRepository {
	constructor(private readonly db: Db) {}

	/**
	 * Execuções de tarefa finalizadas das sessões concluídas da versão, no período, com
	 * suíte, sessão e persona embutidas.
	 */
	async findInRange(
		range: DateRange,
		protocolVersionId: string,
	): Promise<TaskRunRow[]> {
		return this.db
			.select({
				taskId: taskRuns.taskId,
				suiteRunId: taskRuns.suiteRunId,
				suiteId: suiteRuns.suiteId,
				sessionId: suiteRuns.sessionId,
				persona: sessions.persona,
				outcome: taskRuns.outcome,
				activeMs: taskRuns.activeMs,
			})
			.from(taskRuns)
			.innerJoin(suiteRuns, eq(taskRuns.suiteRunId, suiteRuns.id))
			.innerJoin(sessions, eq(suiteRuns.sessionId, sessions.id))
			.where(
				and(
					completedSessionsOf(protocolVersionId),
					dateRangeFilter(sessions.startedAt, range),
					isNotNull(taskRuns.finishedAt),
				),
			);
	}

	/**
	 * Tarefas das suítes informadas, na ordem em que foram executadas (`position` do
	 * `taskRun`, não a do protocolo — pular uma tarefa a reordena para o fim).
	 */
	async findBySuiteRunIds(suiteRunIds: string[]): Promise<SuiteTaskRunRow[]> {
		if (suiteRunIds.length === 0) return [];

		return this.db
			.select({
				suiteRunId: taskRuns.suiteRunId,
				taskCode: taskDefs.code,
				taskTitle: taskDefs.title,
				position: taskRuns.position,
				outcome: taskRuns.outcome,
				activeMs: taskRuns.activeMs,
				autoDetected: taskRuns.autoDetected,
				startedAt: taskRuns.startedAt,
				finishedAt: taskRuns.finishedAt,
			})
			.from(taskRuns)
			.innerJoin(taskDefs, eq(taskRuns.taskId, taskDefs.id))
			.where(inArray(taskRuns.suiteRunId, suiteRunIds))
			.orderBy(taskRuns.position);
	}
}
