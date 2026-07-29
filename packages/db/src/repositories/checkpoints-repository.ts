import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import { answers, events, suiteRuns, taskRuns } from "../schema/collection";
import type { outcomes } from "../schema/enums";
import type * as schema from "../schema/index";

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

export interface ReplaceSuiteCheckpointInput {
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

export interface ReplaceSuiteCheckpointResult {
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
	 * Substitui a execução da suíte inteira: apaga a `suite_run` anterior daquela
	 * sessão+suíte (se houver) e grava uma nova, com `task_runs`/`answers` novos.
	 *
	 * A idempotência de reenvio (A4) vem daqui, não de upsert linha a linha: como
	 * `suite_runs` tem exclusão em cascata sobre `task_runs` e `answers`
	 * (`schema/collection.ts`), apagar a execução antiga já limpa os dependentes dela,
	 * e o checkpoint sempre chega com o bloco completo daquela suíte — nunca parcial.
	 *
	 * Eventos não entram nessa troca: vivem presos só à sessão (não à `suite_run`), e a
	 * idempotência deles é por `client_event_id`, não por substituição de bloco — é o
	 * que permite a mesma etapa chegar em mais de uma fatia (R4) sem que a segunda
	 * fatia apague os eventos da primeira.
	 */
	async replaceSuiteCheckpoint(
		input: ReplaceSuiteCheckpointInput,
	): Promise<ReplaceSuiteCheckpointResult> {
		return this.db.transaction(async (tx) => {
			const [existing] = await tx
				.select({ id: suiteRuns.id })
				.from(suiteRuns)
				.where(
					and(
						eq(suiteRuns.sessionId, input.sessionId),
						eq(suiteRuns.suiteId, input.suiteId),
					),
				);
			if (existing) {
				await tx.delete(suiteRuns).where(eq(suiteRuns.id, existing.id));
			}

			const suiteRunId = randomUUID();
			await tx.insert(suiteRuns).values({
				id: suiteRunId,
				sessionId: input.sessionId,
				suiteId: input.suiteId,
				...input.suite,
			});

			if (input.tasks.length > 0) {
				await tx.insert(taskRuns).values(
					input.tasks.map((task) => ({
						id: randomUUID(),
						suiteRunId,
						...task,
					})),
				);
			}

			if (input.answers.length > 0) {
				await tx.insert(answers).values(
					input.answers.map((answer) => ({
						id: randomUUID(),
						sessionId: input.sessionId,
						suiteRunId,
						...answer,
					})),
				);
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
					existingEvents.map((row) => row.clientEventId),
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

			return { suiteRunId, receivedEvents };
		});
	}
}
