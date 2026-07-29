import { assertClientKey } from "./client-key";
import { clientIpFrom, usabilityRateLimiter } from "./rate-limit";

/**
 * Chave de cliente + limite de requisições (S08), na ordem que a mesma ticket exige:
 * chave primeiro — requisição sem chave ou com chave errada é recusada antes de
 * qualquer outro processamento, incluindo a contagem do rate limit.
 *
 * Chamado no início do resolver de cada uma das cinco procedures públicas de
 * `usability.*`, nunca como middleware da `publicProcedure` base — ver a nota em
 * `client-key.ts`.
 */
export function enforceUsabilityGuard(ctx: { headers: Headers }): void {
	assertClientKey(ctx.headers);
	usabilityRateLimiter.check(clientIpFrom(ctx.headers));
}
