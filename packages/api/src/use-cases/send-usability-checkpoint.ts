import type { Repositories } from "@oikos-circular-environment/survey-db/repositories/index";
import { TRPCError } from "@trpc/server";

import type { UsabilityCheckpointInput } from "../routers/usability-schemas";

export interface SendUsabilityCheckpointResult {
	session_id: string;
	suite_code: string;
	chunk_index: number;
	received_events: number;
	/** Verdadeiro só na última fatia declarada (`chunk.index` alcança `chunk.total`). */
	suite_complete: boolean;
}

/**
 * E3 — grava o bloco de uma etapa. `NOT_FOUND` se a sessão não existir (E2 precisa vir
 * antes), `BAD_REQUEST` se a suíte, alguma tarefa ou alguma pergunta referenciada não
 * existir na versão de protocolo que a sessão executa — o mesmo tipo de erro de digitação
 * que a chave estrangeira das tabelas de protocolo evita no seed (A2), aqui pego na borda
 * em vez de estourar como FK violation.
 *
 * A escrita em si (convergência idempotente da suíte, união idempotente dos eventos)
 * vive em `CheckpointsRepository.upsertSuiteCheckpoint` — este use-case só resolve
 * código→id e traduz entrada/saída.
 */
export async function sendUsabilityCheckpoint(
	repositories: Repositories,
	input: UsabilityCheckpointInput,
): Promise<SendUsabilityCheckpointResult> {
	const session = await repositories.sessions.findStateById(input.session_id);
	if (!session) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Sessão "${input.session_id}" não encontrada.`,
		});
	}

	const suiteId = await repositories.protocol.findSuiteIdByCode(
		session.protocolVersionId,
		input.suite.code,
	);
	if (!suiteId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Suíte "${input.suite.code}" não existe no protocolo desta sessão.`,
		});
	}

	const taskIdByCode = await repositories.protocol.findTaskIdsByCodes(
		suiteId,
		input.tasks.map((task) => task.code),
	);
	const missingTask = input.tasks.find((task) => !taskIdByCode.has(task.code));
	if (missingTask) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Tarefa "${missingTask.code}" não existe na suíte "${input.suite.code}".`,
		});
	}

	const questionKeys = [...new Set(input.answers.map((a) => a.question_key))];
	const questionIdByKey = await repositories.protocol.findQuestionIdsByKeys(
		session.protocolVersionId,
		questionKeys,
	);
	const missingAnswer = input.answers.find(
		(answer) => !questionIdByKey.has(answer.question_key),
	);
	if (missingAnswer) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Pergunta "${missingAnswer.question_key}" não existe no protocolo desta sessão.`,
		});
	}

	const result = await repositories.checkpoints.upsertSuiteCheckpoint({
		sessionId: input.session_id,
		suiteId,
		suite: {
			position: input.suite.position,
			startedAt: input.suite.started_at,
			finishedAt: input.suite.finished_at,
			activeMs: input.suite.active_ms,
			wallMs: input.suite.wall_ms,
			outcome: input.suite.outcome,
		},
		tasks: input.tasks.map((task) => {
			const taskId = taskIdByCode.get(task.code);
			if (!taskId)
				throw new Error("tarefa resolvida perdida entre validação e escrita");
			return {
				taskId,
				position: task.position,
				startedAt: task.started_at,
				finishedAt: task.finished_at,
				activeMs: task.active_ms,
				outcome: task.outcome,
				autoDetected: task.auto_detected,
			};
		}),
		answers: input.answers.map((answer) => {
			const questionId = questionIdByKey.get(answer.question_key);
			if (!questionId)
				throw new Error("pergunta resolvida perdida entre validação e escrita");
			return {
				questionId,
				valueText: answer.value_text,
				valueNumber: answer.value_number,
			};
		}),
		events: input.events.map((event) => ({
			clientEventId: event.client_event_id,
			seq: event.seq,
			type: event.type,
			suiteCode: event.suite_code,
			taskCode: event.task_code,
			occurredAt: event.occurred_at,
			payload: event.payload,
		})),
	});

	return {
		session_id: input.session_id,
		suite_code: input.suite.code,
		chunk_index: input.chunk.index,
		received_events: result.receivedEvents,
		suite_complete: input.chunk.index + 1 >= input.chunk.total,
	};
}
