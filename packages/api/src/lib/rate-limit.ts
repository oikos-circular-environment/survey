import { TRPCError } from "@trpc/server";

/**
 * Limite fixo por IP (S08): 1000 requisições por segundo nas cinco procedures públicas
 * de usabilidade. Em memória, de propósito — sem Redis: baixo tráfego (poucos
 * checkpoints grandes por sessão, não um fluxo contínuo), um único processo Next, e o
 * ambiente já roda numa camada gratuita sob pressão de memória (R10). Não existe
 * utilitário de rate limit em nenhum outro pacote do monorepo (nenhum resultado para
 * "rate limit"/"RateLimit" fora deste arquivo), então este é novo, não extração.
 *
 * Aberto o bastante para o envio contínuo: a proteção real é o `x-client-key`
 * (`apiKeyProcedure`, middleware em `index.ts`); o rate limit é só uma válvula contra
 * flood acidental (S08). É um número, não uma regra de negócio.
 *
 * Janela fixa, não deslizante: simples de raciocinar e suficiente para o volume real.
 * Cada instância tem seu próprio mapa — não é module-level global — para que os testes
 * rodem isolados uns dos outros sem vazar contagem.
 */
export class RateLimiter {
	private readonly hits = new Map<
		string,
		{ count: number; windowStart: number }
	>();

	constructor(
		private readonly limit = 60,
		private readonly windowMs = 60_000,
	) {}

	/** Lança `TOO_MANY_REQUESTS` quando `key` (o IP) já esgotou a janela atual. */
	check(key: string, now = Date.now()): void {
		const entry = this.hits.get(key);

		if (!entry || now - entry.windowStart >= this.windowMs) {
			this.hits.set(key, { count: 1, windowStart: now });
			return;
		}

		entry.count += 1;
		if (entry.count > this.limit) {
			throw new TRPCError({
				code: "TOO_MANY_REQUESTS",
				message: `Limite de ${this.limit} requisições ${this.windowLabel()} excedido.`,
			});
		}
	}

	private windowLabel(): string {
		if (this.windowMs >= 60_000) return "por minuto";
		if (this.windowMs >= 1_000) return "por segundo";
		return `por ${this.windowMs} ms`;
	}
}

/** Instância única para as cinco procedures públicas de `usability.*`. */
export const usabilityRateLimiter = new RateLimiter(1000, 1_000);

const UNKNOWN_IP = "unknown";

/**
 * Extrai o IP do cliente a partir dos headers da requisição — `x-forwarded-for` (o Next
 * roda atrás de proxy/CDN em produção) com fallback para `x-real-ip`. Sem nenhum dos
 * dois (ex.: teste local direto), agrupa sob uma chave fixa: degrada para "todo mundo
 * compartilha uma janela", nunca para "sem limite".
 */
export function clientIpFrom(headers: Headers): string {
	const forwardedFor = headers.get("x-forwarded-for");
	if (forwardedFor) {
		const first = forwardedFor.split(",")[0]?.trim();
		if (first) return first;
	}
	return headers.get("x-real-ip") ?? UNKNOWN_IP;
}
