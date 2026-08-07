import type { Repositories } from "@oikos-circular-environment/survey-db/repositories/index";
import { TRPCError } from "@trpc/server";

import type { UsabilityFinishInput } from "../routers/usability-schemas";

export interface FinishUsabilitySessionResult {
	participant_code: string;
	status: "COMPLETED";
}

/**
 * E4 — grava as respostas de fim de sessão e marca `COMPLETED`. Idempotente: reenviar
 * devolve o mesmo `participant_code` e substitui (não acumula) as respostas finais —
 * ver a ressalva de índice único nulo em `AnswersRepository.upsertFinalAnswers`.
 */
export async function finishUsabilitySession(
	repositories: Repositories,
	input: UsabilityFinishInput,
): Promise<FinishUsabilitySessionResult> {
	const session = await repositories.sessions.findStateById(input.session_id);
	if (!session) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Sessão "${input.session_id}" não encontrada.`,
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

	await repositories.answers.upsertFinalAnswers(
		input.session_id,
		input.answers.map((answer) => {
			const questionId = questionIdByKey.get(answer.question_key);
			if (!questionId)
				throw new Error("pergunta resolvida perdida entre validação e escrita");
			return {
				questionId,
				valueText: answer.value_text,
				valueNumber: answer.value_number,
			};
		}),
	);

	await repositories.sessions.markCompleted(input.session_id, {
		activeMs: input.active_ms,
		wallMs: input.wall_ms,
		finishedAt: input.finished_at,
	});

	return { participant_code: session.participantCode, status: "COMPLETED" };
}
