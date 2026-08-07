import { randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
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
}

/**
 * Escrita do checkpoint de etapa (E3) — a única aggregate que precisa tocar
 * `suite_runs`, `task_runs`, `answers` e `events` numa transação só, então não cabe
 * em nenhum dos repositórios de leitura existentes sem forçá-los a conhecer uns aos
 * outros.
 */
export class CheckpointsRepository {
	constructor(private readonly db: Db) {}

	/**
	 * Faz convergir o estado de uma suíte para o que o payload descreve, sem apagar
	 * nada do que já foi gravado. Cada linha entra com `INSERT ... ON DUPLICATE KEY
	 * UPDATE` sobre o índice único que já existe (`suite_runs_session_suite`,
	 * `task_runs_suite_run_task`, `answers_session_run_question`), uma statement por
	 * linha — o `set` é montado em JS e omite a chave ausente, então um envio parcial
	 * não regride um campo que chegou completo antes.
	 *
	 * O checkpoint não pressupõe mais chegar com o bloco completo daquela suíte: com
	 * envio contínuo ele chega quantas vezes for preciso, e cada envio descreve o
	 * estado até aquele instante. Idempotência é por convergência, não por destruição.
	 *
	 * Campos monotônicos usam SQL, não JS: `least` em `started_at` e `greatest` em
	 * `active_ms`/`wall_ms` fazem um reenvio antigo não desfazer o novo, e `or` impede
	 * um tick posterior de apagar um `auto_detected` que um tick anterior viu.
	 *
	 * `id` e `created_at` nunca entram no `set`: `id` é PK referenciada por `task_runs`
	 * e `answers` (FK sem `ON UPDATE CASCADE`), e `created_at` marca o primeiro envio,
	 * não o último.
	 *
	 * Tasks e answers são percorridos em ordem de id para que transações concorrentes
	 * adquiram locks na mesma ordem; o `retryOnDeadlock` cobre a janela que resta.
	 *
	 * Eventos não entram na troca de suíte: vivem presos só à sessão (não à
	 * `suite_run`), e a idempotência deles é por `client_event_id` — é o que permite a
	 * mesma etapa chegar em mais de uma fatia sem que a segunda apague os eventos da
	 * primeira.
	 */
	async upsertSuiteCheckpoint(
		input: UpsertSuiteCheckpointInput,
	): Promise<UpsertSuiteCheckpointResult> {
		return retryOnDeadlock(() =>
			this.db.transaction(async (tx) => {
				await tx
					.insert(suiteRuns)
					.values({
						id: randomUUID(),
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
					.select({ id: suiteRuns.id })
					.from(suiteRuns)
					.where(
						and(
							eq(suiteRuns.sessionId, input.sessionId),
							eq(suiteRuns.suiteId, input.suiteId),
						),
					);
				if (!row) throw new Error("upsert da suite_run não deixou linha");

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

				// idempotência dos eventos (R4/A4): só entra quem ainda não existe para a sessão
				let receivedEvents = 0;
				if (input.events.length > 0) {
					const existingEvents = await tx
						.select({ clientEventId: events.clientEventId })
						.from(events)
						.where(
							and(
								eq(events.sessionId, input.sessionId),
								inArray(
									events.clientEventId,
									input.events.map((event) => event.clientEventId),
								),
							),
						);
					const existingIds = new Set(
						existingEvents.map((rowEvent) => rowEvent.clientEventId),
					);
					const newEvents = input.events.filter(
						(event) => !existingIds.has(event.clientEventId),
					);

					if (newEvents.length > 0) {
						await tx.insert(events).values(
							newEvents.map((event) => ({
								id: randomUUID(),
								sessionId: input.sessionId,
								...event,
							})),
						);
					}
					receivedEvents = newEvents.length;
				}

				return { suiteRunId: row.id, receivedEvents };
			}),
		);
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
