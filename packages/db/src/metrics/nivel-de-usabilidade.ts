export type ClassificacaoUsabilidade =
	| "Péssimo"
	| "Satisfatório"
	| "Bom"
	| "Ótimo";

export interface NivelDeUsabilidadeInput {
	/** Eficácia (Te), 0-1 — ver `eficacia.ts`. */
	te: number;
	/** Eficiência (Tf), 0-1 — ver `eficiencia.ts`. */
	tf: number;
	/** Satisfação normalizada (Ts), 0-1 — ver `satisfacaoTaxa` em `satisfacao.ts`. */
	ts: number;
}

/**
 * Nível de Usabilidade — média das três taxas ISO 9241-11 (Eficácia, Eficiência,
 * Satisfação), conforme Lima, Oliveira & Santana (2013), seção "Cálculo do nível de
 * usabilidade": `Us = (Te + Tf + Ts) / 3`.
 *
 * "Us" é a abreviação do artigo original (de "Usabilidade"); este dashboard usa o nome
 * por extenso "Nível de Usabilidade" em tudo que é voltado ao usuário final — nunca
 * "Usabilidade geral", nome que não existe na fonte citada.
 *
 * Ressalva metodológica discutida durante o design: as três taxas só são "comparáveis"
 * no sentido estrito de estarem todas normalizadas para 0-1. Te e Tf vêm de medição
 * objetiva/comportamental; Ts vem de autorrelato — são tipos de medição estruturalmente
 * diferentes, e o peso igual (1/3 cada) é uma escolha do artigo original, não algo
 * derivado empiricamente. Uma composição alternativa baseada só em itens Likert
 * homogêneos (ver `heuristicas.ts`) seria mais defensável psicometricamente, mas o
 * usuário optou por manter esta fórmula como a fonte primária do dashboard.
 */
export function nivelDeUsabilidade({
	te,
	tf,
	ts,
}: NivelDeUsabilidadeInput): number {
	return (te + tf + ts) / 3;
}

/**
 * Classifica um valor de Nível de Usabilidade (0-1) em 4 faixas iguais, conforme a
 * "Figura 1" de Lima, Oliveira & Santana (2013).
 */
export function classificar(valor: number): ClassificacaoUsabilidade {
	if (valor < 0.25) return "Péssimo";
	if (valor < 0.5) return "Satisfatório";
	if (valor < 0.75) return "Bom";
	return "Ótimo";
}
