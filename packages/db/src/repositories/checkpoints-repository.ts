import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import { answers, events, suiteRuns, taskRuns } from "../schema/collection";
import type { outcomes } from "../schema/enums";
import type * as schema from "../schema/index";
import { retryOnDeadlock } from "./retry-on-deadlock";

type Db = MySql2Database<typeof schema>;

export interface CheckpointTaskInput {
	taskId: string;
	position: number;
	startedAt: Date;
	finishedAt?: Date;
	activeMs: number;
	outcome?: (typeof outcomes)[number];
	autoDetected: boolean;
}

export interface CheckpointAnswerInput {
	questionId: string;
	valueText?: string;
	valueNumber?: number;
}

export interface CheckpointEventInput {
	clientEventId: string;
	seq: number;
	type: string;
	suiteCode?: string;
	taskCode?: string;
	occurredAt: Date;
	payload: Record<string, unknown>;
}

export interface UpsertSuiteCheckpointInput {
	sessionId: string;
	suiteRunId?: string;
	suiteId: string;
	suite: {
		position: number;
		startedAt: Date;
		finishedAt?: Date;
		activeMs: number;
		wallMs: number;
		outcome?: (typeof outcomes)[number];
	};
	tasks: CheckpointTaskInput[];
	answers: CheckpointAnswerInput[];
	events: CheckpointEventInput[];
}

export interface UpsertSuiteCheckpointResult {
	suiteRunId: string;
	receivedEvents: number;
	suiteComplete: boolean;
}

/**
 * Escrita do checkpoint de etapa (E3) — a única aggregate que precisa tocar
 * `suite_runs`, `task_runs`, `answers` e `events` numa transação só, então não cabe
 * em nenhum dos repositórios de leitura existentes sem forçá-los a conhecer uns aos
 * outros.
 */
export class CheckpointsRepository {
	constructor(private readonly db: Db) {}

	async upsertSuiteCheckpoint(
		input: UpsertSuiteCheckpointInput,
	): Promise<UpsertSuiteCheckpointResult> {
		const receivedEvents = await this.insertEvents(
			input.sessionId,
			input.events,
		);
		const { id: suiteRunId, suiteComplete } = await retryOnDeadlock(() =>
			this.db.transaction(async (tx) => {
				await tx
					.insert(suiteRuns)
					.values({
						id: input.suiteRunId ?? randomUUID(),
						sessionId: input.sessionId,
						suiteId: input.suiteId,
						position: input.suite.position,
						startedAt: input.suite.startedAt,
						finishedAt: input.suite.finishedAt,
						activeMs: input.suite.activeMs,
						wallMs: input.suite.wallMs,
						outcome: input.suite.outcome,
					})
					.onDuplicateKeyUpdate({
						set: {
							position: input.suite.position,
							startedAt: sql`least(${suiteRuns.startedAt}, ${input.suite.startedAt})`,
							activeMs: sql`greatest(${suiteRuns.activeMs}, ${input.suite.activeMs})`,
							wallMs: sql`greatest(${suiteRuns.wallMs}, ${input.suite.wallMs})`,
							...suiteFinishSet(input.suite),
						},
					});

				const [row] = await tx
					.select({
						id: suiteRuns.id,
						finishedAt: suiteRuns.finishedAt,
						outcome: suiteRuns.outcome,
					})
					.from(suiteRuns)
					.where(
						and(
							eq(suiteRuns.sessionId, input.sessionId),
							eq(suiteRuns.suiteId, input.suiteId),
						),
					);
				if (!row) throw new Error("upsert da suite_run não deixou linha");
				const suiteComplete = row.finishedAt !== null && row.outcome !== null;

				const orderedTasks = [...input.tasks].sort((a, b) =>
					a.taskId.localeCompare(b.taskId),
				);
				for (const task of orderedTasks) {
					await tx
						.insert(taskRuns)
						.values({
							id: randomUUID(),
							suiteRunId: row.id,
							taskId: task.taskId,
							position: task.position,
							startedAt: task.startedAt,
							finishedAt: task.finishedAt,
							activeMs: task.activeMs,
							outcome: task.outcome,
							autoDetected: task.autoDetected,
						})
						.onDuplicateKeyUpdate({
							set: {
								position: task.position,
								startedAt: sql`least(${taskRuns.startedAt}, ${task.startedAt})`,
								activeMs: sql`greatest(${taskRuns.activeMs}, ${task.activeMs})`,
								autoDetected: sql`(${taskRuns.autoDetected} or ${task.autoDetected})`,
								...taskFinishSet(task),
							},
						});
				}

				const orderedAnswers = [...input.answers].sort((a, b) =>
					a.questionId.localeCompare(b.questionId),
				);
				for (const answer of orderedAnswers) {
					await tx
						.insert(answers)
						.values({
							id: randomUUID(),
							sessionId: input.sessionId,
							suiteRunId: row.id,
							questionId: answer.questionId,
							valueText: answer.valueText,
							valueNumber: answer.valueNumber,
						})
						.onDuplicateKeyUpdate({
							set: answerValueSet(answer),
						});
				}

				return { id: row.id, suiteComplete };
			}),
		);
		return { suiteRunId, receivedEvents, suiteComplete };
	}

	private async insertEvents(
		sessionId: string,
		input: CheckpointEventInput[],
	): Promise<number> {
		if (input.length === 0) return 0;
		const [result] = await this.db
			.insert(events)
			.values(
				input.map((event) => ({
					id: randomUUID(),
					sessionId,
					...event,
				})),
			)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } });
		return result.affectedRows;
	}
}

function suiteFinishSet(suite: UpsertSuiteCheckpointInput["suite"]) {
	return {
		...(suite.finishedAt !== undefined ? { finishedAt: suite.finishedAt } : {}),
		...(suite.outcome !== undefined ? { outcome: suite.outcome } : {}),
	};
}

function taskFinishSet(task: CheckpointTaskInput) {
	return {
		...(task.finishedAt !== undefined ? { finishedAt: task.finishedAt } : {}),
		...(task.outcome !== undefined ? { outcome: task.outcome } : {}),
	};
}

function answerValueSet(answer: CheckpointAnswerInput) {
	return {
		...(answer.valueText !== undefined ? { valueText: answer.valueText } : {}),
		...(answer.valueNumber !== undefined
			? { valueNumber: answer.valueNumber }
			: {}),
	};
}
