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

/**
 * Cor fixa por persona — usada em qualquer lugar da aplicação que precise diferenciar
 * persona por cor (gráficos, swatches, legendas). Fixas de propósito, não retiradas da
 * paleta categórica genérica `--chart-1..5`: aquela paleta tem tonalidades próximas
 * demais entre si para diferenciar 5 séries ao mesmo tempo num gráfico de área
 * empilhado. `CITIZEN` usa a cor primária do tema (`var(--primary)`) em vez de um hex
 * fixo, por pedido explícito.
 */
export const PERSONA_COLORS: Record<string, string> = {
	COLLECTOR: "#2b78d6",
	RECYCLING_COMPANY: "#eb6734",
	GENERAL_COMPANY: "#1ab07c",
	CITIZEN: "var(--primary)",
	GOVERNMENT: "#e87ba5",
};
