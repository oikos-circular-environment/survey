import { initTRPC } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

/** Usado pelos testes de integração dos routers — chama procedures sem HTTP. */
export const createCallerFactory = t.createCallerFactory;
