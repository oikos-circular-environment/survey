import { initTRPC } from "@trpc/server";

import type { Context } from "./context";
import { assertClientKey } from "./lib/client-key";
import { requireAdminSession } from "./lib/dashboard-guard";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

/**
 * Base de toda procedure tRPC (S08 estendido a todo o router, não só `usability.*`):
 * confere a chave de cliente global antes de qualquer outra coisa — mobile e o próprio
 * frontend do `web` mandam o mesmo cabeçalho (`utils/trpc.ts`) contra o próprio backend.
 *
 * É middleware, e não checagem manual no início de cada resolver como em S08: o motivo
 * original para não usar middleware (`usability-guard.ts`) era a lista de exceções que
 * `dashboard.*` exigiria de uma `publicProcedure` compartilhada. Agora `dashboard.*`
 * também precisa da mesma checagem, então não sobra procedure nenhuma para excluir — e
 * é exatamente a lista de exceções que erra (S08). `usability.*` e `dashboard.*`
 * constroem a partir daqui, não de `publicProcedure` direto.
 */
export const apiKeyProcedure = t.procedure.use(({ ctx, next }) => {
	assertClientKey(ctx.headers);
	return next();
});

/**
 * Base de toda procedure de `dashboard.*` (S09/S10/A9): chave de cliente (herdada de
 * `apiKeyProcedure`) **e** sessão do Better Auth com papel `admin`, as duas sempre
 * juntas — ver `lib/dashboard-guard.ts`. `usability.*` nunca constrói a partir daqui:
 * as cinco procedures públicas não têm conta de pesquisador nem de participante (A5).
 */
export const dashboardProcedure = apiKeyProcedure.use(async ({ ctx, next }) => {
	const session = await requireAdminSession(ctx);
	return next({ ctx: { ...ctx, session } });
});

/** Usado pelos testes de integração dos routers — chama procedures sem HTTP. */
export const createCallerFactory = t.createCallerFactory;
