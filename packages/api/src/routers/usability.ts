import { apiKeyProcedure, router } from "../index";
import { enforceUsabilityGuard } from "../lib/usability-guard";
import { abandonUsabilitySession } from "../use-cases/abandon-usability-session";
import { deleteUsabilitySessionData } from "../use-cases/delete-usability-session-data";
import { finishUsabilitySession } from "../use-cases/finish-usability-session";
import { getProtocol } from "../use-cases/get-protocol";
import { sendUsabilityCheckpoint } from "../use-cases/send-usability-checkpoint";
import { upsertUsabilitySession } from "../use-cases/upsert-usability-session";
import {
	usabilityAbandonInput,
	usabilityCheckpointInput,
	usabilityFinishInput,
	usabilitySessionDeleteInput,
	usabilitySessionUpsertInput,
} from "./usability-schemas";

/**
 * As seis procedures públicas que o aplicativo mobile consome, sob `usability.*` —
 * `usability.protocol`, `usability.session.upsert`, `usability.session.delete`,
 * `usability.checkpoint.send`, `usability.finish`, `usability.abandon`.
 *
 * Constroem a partir de `apiKeyProcedure` (a chave de cliente vira middleware, não mais
 * checagem manual — ver `index.ts`), e não de `dashboardProcedure`: são "públicas" no
 * sentido de A5 — sem conta de pesquisador nem de participante, então nunca exigem
 * sessão. Cada resolver ainda chama `enforceUsabilityGuard` explicitamente, mas só pelo
 * limite de requisições agora (S08/R3) — dimensionado para o tráfego destas rotas,
 * não estendido a `dashboard.*`.
 */
export const usabilityRouter = router({
	protocol: apiKeyProcedure.query(({ ctx }) => {
		enforceUsabilityGuard(ctx);
		return getProtocol(ctx.repositories);
	}),

	session: router({
		upsert: apiKeyProcedure
			.input(usabilitySessionUpsertInput)
			.mutation(({ ctx, input }) => {
				enforceUsabilityGuard(ctx);
				return upsertUsabilitySession(ctx.repositories, input);
			}),

		delete: apiKeyProcedure
			.input(usabilitySessionDeleteInput)
			.mutation(({ ctx, input }) => {
				enforceUsabilityGuard(ctx);
				return deleteUsabilitySessionData(ctx.repositories, input);
			}),
	}),

	checkpoint: router({
		send: apiKeyProcedure
			.input(usabilityCheckpointInput)
			.mutation(({ ctx, input }) => {
				enforceUsabilityGuard(ctx);
				return sendUsabilityCheckpoint(ctx.repositories, input);
			}),
	}),

	finish: apiKeyProcedure
		.input(usabilityFinishInput)
		.mutation(({ ctx, input }) => {
			enforceUsabilityGuard(ctx);
			return finishUsabilitySession(ctx.repositories, input);
		}),

	abandon: apiKeyProcedure
		.input(usabilityAbandonInput)
		.mutation(({ ctx, input }) => {
			enforceUsabilityGuard(ctx);
			return abandonUsabilitySession(ctx.repositories, input);
		}),
});
