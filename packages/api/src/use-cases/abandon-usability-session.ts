import type { Repositories } from "@oikos-circular-environment/survey-db/repositories/index";
import { TRPCError } from "@trpc/server";

import type { UsabilityAbandonInput } from "../routers/usability-schemas";

export interface AbandonUsabilitySessionResult {
	participant_code: string;
	status: "ABANDONED";
}

/**
 * E5 — registra a desistência. Idempotente (reenviar sobre uma sessão já `ABANDONED`
 * só regrava os mesmos totais), mas recusa quando a sessão já está `COMPLETED`: nesse
 * caso o desfecho já é outro, e sobrescrever silenciosamente esconderia o reenvio
 * tardio de um `abandon` que a fila só conseguiu enviar depois do `finish`.
 */
export async function abandonUsabilitySession(
	repositories: Repositories,
	input: UsabilityAbandonInput,
): Promise<AbandonUsabilitySessionResult> {
	const session = await repositories.sessions.findStateById(input.session_id);
	if (!session) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Sessão "${input.session_id}" não encontrada.`,
		});
	}
	if (session.status === "COMPLETED") {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Sessão já concluída, não é possível desistir de uma participação encerrada.",
		});
	}

	await repositories.sessions.markAbandoned(input.session_id, {
		reason: input.reason,
		activeMs: input.active_ms,
		wallMs: input.wall_ms,
		finishedAt: input.finished_at,
	});

	return { participant_code: session.participantCode, status: "ABANDONED" };
}
