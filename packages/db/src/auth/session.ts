/**
 * Utilitário de autorização (S09/A9): resolve a sessão do Better Auth a partir dos
 * cabeçalhos da requisição e confere o papel. Ponto único usado tanto pela proteção de
 * rota do painel (`apps/web/src/middleware.ts`) quanto pelo guard de `dashboard.*` em
 * `packages/api` — nenhum dos dois reimplementa a checagem de papel.
 *
 * Devolve `null` tanto para "sem sessão" quanto para "sessão sem papel `admin`": quem
 * chama não precisa (e não deve) diferenciar os dois casos — ver S09, "o dia em que
 * houver uma conta sem papel administrador é o dia em que ninguém vai lembrar de
 * checar".
 *
 * Recebe a instância do Better Auth como parâmetro, e não importa o singleton `auth`
 * direto, para que os testes passem uma instância amarrada ao banco efêmero da suíte.
 */

import type { auth as authSingleton } from "./config";

export type AdminSession = typeof authSingleton.$Infer.Session;

type Auth = Pick<typeof authSingleton, "api">;

const ADMIN_ROLE = "admin";

export async function resolveAdminSession(
	headers: Headers,
	auth: Auth,
): Promise<AdminSession | null> {
	const session = await auth.api.getSession({ headers });
	if (!session) return null;

	const role = (session.user as { role?: string }).role;
	if (role !== ADMIN_ROLE) return null;

	return session as AdminSession;
}
