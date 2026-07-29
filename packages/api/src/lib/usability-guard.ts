import { clientIpFrom, usabilityRateLimiter } from "./rate-limit";

/**
 * Limite de requisições por IP (S08/R3), só nas cinco procedures de `usability.*`.
 *
 * A chave de cliente já é checada por `apiKeyProcedure` (middleware, `index.ts`) antes
 * de qualquer resolver rodar — não repetida aqui. O rate limit continua chamado
 * manualmente no início de cada resolver, e não estendido a `dashboard.*`: é dimensionado
 * para o padrão de tráfego das cinco rotas públicas (poucos checkpoints grandes por
 * sessão, R3), que nada tem a ver com o volume de uma sessão de painel autenticada.
 */
export function enforceUsabilityGuard(ctx: { headers: Headers }): void {
	usabilityRateLimiter.check(clientIpFrom(ctx.headers));
}
