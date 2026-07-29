import { db } from "@oikos-circular-environment/survey-db";
import type { createAuth } from "@oikos-circular-environment/survey-db/auth/config";
import { auth } from "@oikos-circular-environment/survey-db/auth/index";
import type { AdminSession } from "@oikos-circular-environment/survey-db/auth/session";
import {
	createRepositories,
	type Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";
import type { NextRequest } from "next/server";

const repositories = createRepositories(db);

/** Instância do Better Auth (o tipo, não a instância) — ver a nota em `auth`, abaixo. */
export type AuthInstance = ReturnType<typeof createAuth>;

/**
 * `headers` existe para as cinco procedures públicas de `usability.*` (S08): a chave de
 * cliente e o IP para o limite de requisições são lidos do cabeçalho da requisição, não
 * de nenhuma sessão — essas rotas não têm conta de pesquisador nem de participante (A5).
 *
 * Anotado explicitamente (não `Awaited<ReturnType<typeof createContext>>`): o tipo
 * `Headers` do runtime fetch, sem `lib: "dom"` neste tsconfig, só existe via
 * `@types/node`/`undici-types`, e o TypeScript recusa sintetizar essa referência sozinho
 * ao emitir a declaração do pacote (`TS2883`) — precisa do nome escrito à mão aqui.
 *
 * `auth` carrega a instância do Better Auth usada para resolver sessão (S09/S10/A9) —
 * é campo do contexto, e não import direto do singleton dentro do guard de
 * `dashboard.*`, para que os testes injetem uma instância amarrada ao banco efêmero da
 * suíte em vez da conexão de produção. `session` começa `null` para toda procedure: só
 * o guard de `dashboard.*` (`lib/dashboard-guard.ts`) o preenche, depois de validar a
 * chave de cliente e a sessão — `usability.*` nunca precisa dele.
 */
export interface Context {
	auth: Pick<AuthInstance, "api"> | null;
	session: AdminSession | null;
	repositories: Repositories;
	headers: Headers;
}

export async function createContext(req: NextRequest): Promise<Context> {
	return {
		auth,
		session: null,
		repositories,
		headers: req.headers,
	};
}
