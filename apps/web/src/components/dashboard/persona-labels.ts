/**
 * Rótulos de persona para telas que só recebem a `key` crua (ex.: a série diária da
 * Visão geral, agrupada por `sessions.persona`). Onde a API já resolve o rótulo via
 * `personaDefs` (tabela Por persona, Suíte → personas), usar o `label` retornado, não
 * este mapa — evita duas fontes divergirem se o protocolo mudar os rótulos.
 */
export const PERSONA_LABELS: Record<string, string> = {
	COLLECTOR: "Coletor(a)",
	RECYCLING_COMPANY: "Empresa de reciclagem",
	GENERAL_COMPANY: "Empresa comum",
	CITIZEN: "Cidadão",
	GOVERNMENT: "Órgão público",
};

/** Ordem categórica fixa — mesma ordem usada no desenho do Pencil (chart-cat-1..5). */
export const PERSONA_ORDER = [
	"COLLECTOR",
	"RECYCLING_COMPANY",
	"GENERAL_COMPANY",
	"CITIZEN",
	"GOVERNMENT",
] as const;
