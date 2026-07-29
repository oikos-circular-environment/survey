import { auth } from "@oikos-circular-environment/survey-db/auth/index";
import { resolveAdminSession } from "@oikos-circular-environment/survey-db/auth/session";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Protege `/dashboard/**` (S10). O Next 16 não tem mais runtime edge para este arquivo
 * — `proxy.ts` sempre roda em Node.js — então a checagem aqui é a mesma usada por
 * `dashboard.*` no tRPC (`resolveAdminSession`, com acesso real ao banco), não uma
 * checagem otimista de cookie. A decisão que importa acontece no servidor (S10 AC); se
 * alguma tela do painel também tiver checagem no cliente, ela é só de exibição.
 *
 * Preserva a rota pretendida em `?redirect=` para a página de entrada devolver a
 * navegação para lá depois do login (S10 AC).
 *
 * Recebe a instância do Better Auth como parâmetro (padrão: o singleton) para que
 * `proxy.test.ts` passe uma instância amarrada ao banco efêmero da suíte — mesmo
 * motivo de `Context.auth` em `packages/api`.
 */
export async function buildDashboardGuardResponse(
	request: NextRequest,
	authInstance: Pick<typeof auth, "api"> = auth,
) {
	const session = await resolveAdminSession(request.headers, authInstance);
	if (session) return NextResponse.next();

	const loginUrl = new URL("/login", request.url);
	loginUrl.searchParams.set(
		"redirect",
		request.nextUrl.pathname + request.nextUrl.search,
	);
	return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
	return buildDashboardGuardResponse(request);
}

export const config = {
	matcher: "/dashboard/:path*",
};
