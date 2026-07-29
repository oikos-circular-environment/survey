import { publicProcedure, router } from "../index";
import { assertWithinBodyLimit } from "../lib/body-size";
import { enforceUsabilityGuard } from "../lib/usability-guard";
import { abandonUsabilitySession } from "../use-cases/abandon-usability-session";
import { finishUsabilitySession } from "../use-cases/finish-usability-session";
import { getProtocol } from "../use-cases/get-protocol";
import { sendUsabilityCheckpoint } from "../use-cases/send-usability-checkpoint";
import { upsertUsabilitySession } from "../use-cases/upsert-usability-session";
import {
	usabilityAbandonInput,
	usabilityCheckpointInput,
	usabilityFinishInput,
	usabilitySessionUpsertInput,
} from "./usability-schemas";

/**
 * As cinco procedures públicas que o aplicativo mobile consome (E1–E5 do contrato em
 * `02-tech-plan.md`), sob `usability.*` — `usability.protocol`,
 * `usability.session.upsert`, `usability.checkpoint.send`, `usability.finish`,
 * `usability.abandon`.
 *
 * Cada resolver chama `enforceUsabilityGuard` explicitamente (chave de cliente + limite
 * de requisições, S08) em vez de um middleware aplicado à `publicProcedure` base — que
 * exigiria lista de exceções para as procedures de `dashboard.*`, e é a lista de
 * exceções que erra. Pelo mesmo motivo, o teto de corpo (256 KB) só é checado em
 * `checkpoint.send`, a única das cinco cujo payload cresce com o uso.
 */
export const usabilityRouter = router({
	protocol: publicProcedure.query(({ ctx }) => {
		enforceUsabilityGuard(ctx);
		return getProtocol(ctx.repositories);
	}),

	session: router({
		upsert: publicProcedure
			.input(usabilitySessionUpsertInput)
			.mutation(({ ctx, input }) => {
				enforceUsabilityGuard(ctx);
				return upsertUsabilitySession(ctx.repositories, input);
			}),
	}),

	checkpoint: router({
		send: publicProcedure
			.input(usabilityCheckpointInput)
			.mutation(({ ctx, input }) => {
				enforceUsabilityGuard(ctx);
				assertWithinBodyLimit(input);
				return sendUsabilityCheckpoint(ctx.repositories, input);
			}),
	}),

	finish: publicProcedure
		.input(usabilityFinishInput)
		.mutation(({ ctx, input }) => {
			enforceUsabilityGuard(ctx);
			return finishUsabilitySession(ctx.repositories, input);
		}),

	abandon: publicProcedure
		.input(usabilityAbandonInput)
		.mutation(({ ctx, input }) => {
			enforceUsabilityGuard(ctx);
			return abandonUsabilitySession(ctx.repositories, input);
		}),
});
