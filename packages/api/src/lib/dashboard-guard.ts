import { resolveAdminSession } from "@oikos-circular-environment/survey-db/auth/session";
import { TRPCError } from "@trpc/server";

import type { Context } from "../context";

const UNAUTHORIZED = new TRPCError({
	code: "UNAUTHORIZED",
	message: "Sessão de administrador ausente ou inválida.",
});

/**
 * Exige sessão do Better Auth com papel `admin` (S09/S10/A9) — camada independente da
 * chave de cliente que `apiKeyProcedure` já exige (`client-key.ts`). As duas são
 * obrigatórias ao mesmo tempo em `dashboard.*`: uma chave de cliente válida sem sessão
 * não basta, e uma sessão válida sem chave de cliente também não — ver a introdução da
 * tarefa (defesa em profundidade).
 *
 * `resolveAdminSession` já recusa tanto "sem sessão" quanto "sessão sem papel admin"
 * (ver a nota lá); aqui só resta transformar `null` em erro tRPC.
 */
export async function requireAdminSession(
	ctx: Pick<Context, "auth" | "headers">,
) {
	if (!ctx.auth) throw UNAUTHORIZED;

	const session = await resolveAdminSession(ctx.headers, ctx.auth);
	if (!session) throw UNAUTHORIZED;

	return session;
}
