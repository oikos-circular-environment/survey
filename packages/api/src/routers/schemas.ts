import { z } from "zod";

/**
 * Filtro de período global do dashboard (epoch ms). Os presets da UI ("Última
 * semana", "Últimas 2 semanas", "Últimas 3 semanas", "Último mês", "Personalizado")
 * são resolvidos para `from`/`to` absolutos no cliente antes de chamar a API — o
 * backend só entende intervalo absoluto.
 */
export const dateRangeInput = z.object({
	from: z.number().optional(),
	to: z.number().optional(),
});

export const paginationInput = z.object({
	page: z.number().int().min(1).default(1),
	pageSize: z.number().int().min(1).max(100).default(20),
});
