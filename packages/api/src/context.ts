import { db } from "@oikos-circular-environment/survey-db";
import {
	createRepositories,
	type Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";
import type { NextRequest } from "next/server";

const repositories = createRepositories(db);

/**
 * `headers` existe para as cinco procedures públicas de `usability.*` (S08): a chave de
 * cliente e o IP para o limite de requisições são lidos do cabeçalho da requisição, não
 * de nenhuma sessão — essas rotas não têm conta de pesquisador nem de participante (A5).
 *
 * Anotado explicitamente (não `Awaited<ReturnType<typeof createContext>>`): o tipo
 * `Headers` do runtime fetch, sem `lib: "dom"` neste tsconfig, só existe via
 * `@types/node`/`undici-types`, e o TypeScript recusa sintetizar essa referência sozinho
 * ao emitir a declaração do pacote (`TS2883`) — precisa do nome escrito à mão aqui.
 */
export interface Context {
	auth: null;
	session: null;
	repositories: Repositories;
	headers: Headers;
}

export async function createContext(req: NextRequest): Promise<Context> {
	return {
		auth: null,
		session: null,
		repositories,
		headers: req.headers,
	};
}
