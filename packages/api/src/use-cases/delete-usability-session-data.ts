import type { Repositories } from "@oikos-circular-environment/survey-db/repositories/index";
import { TRPCError } from "@trpc/server";

import type { UsabilitySessionDeleteInput } from "../routers/usability-schemas";

export const SELF_SERVICE_DELETED_BY = "participant:self-service";

export interface DeleteUsabilitySessionDataResult {
	participant_code: string;
	deleted: true;
}

/**
 * Exclusão self-service: o participante já provou posse da sessão só por conhecer
 * `session_id` (mesmo padrão de posse implícita de `finish`/`abandon` — sem conta, sem
 * token além da chave de cliente). Reaproveita `hardDelete` (mesma cascata e
 * auditoria do hard delete do painel), registrando `SELF_SERVICE_DELETED_BY` em vez do
 * id de um usuário do dashboard.
 */
export async function deleteUsabilitySessionData(
	repositories: Repositories,
	input: UsabilitySessionDeleteInput,
): Promise<DeleteUsabilitySessionDataResult> {
	const session = await repositories.sessions.findStateById(input.session_id);
	if (!session) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Sessão "${input.session_id}" não encontrada.`,
		});
	}

	const participantCode = session.participantCode;
	await repositories.sessions.hardDelete(
		input.session_id,
		SELF_SERVICE_DELETED_BY,
	);

	return { participant_code: participantCode, deleted: true };
}
