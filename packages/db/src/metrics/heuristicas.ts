/**
 * Cobertura das heurísticas de Nielsen (1994) pelo protocolo `oikos-walkthrough`.
 *
 * Fonte: `mestrado/plans/oikos-walkthrough.md` §7.2. Nielsen concebeu as 10 heurísticas
 * como método de inspeção por especialista, não como questionário de usuário — nem toda
 * heurística admite autorrelato válido. Este mapa documenta, para cada uma das 10, qual
 * pergunta do protocolo a cobre (quando existe) e por que as que faltam foram deixadas
 * de fora — a mesma cobertura que virou os 10 cards do dashboard no Pencil.
 */

export type HeuristicId =
	| "H1"
	| "H2"
	| "H3"
	| "H4"
	| "H5"
	| "H6"
	| "H7"
	| "H8"
	| "H9"
	| "H10";

export interface MeasuredHeuristic {
	id: HeuristicId;
	name: string;
	measured: true;
	/** `key` da pergunta Likert em `usability_questions` que cobre esta heurística. */
	questionKey: string;
}

export interface UnmeasuredHeuristic {
	id: HeuristicId;
	name: string;
	measured: false;
	/** Motivo documentado — mesmo texto exibido no card "Não medida" do dashboard. */
	reason: string;
}

export type HeuristicDefinition = MeasuredHeuristic | UnmeasuredHeuristic;

/**
 * As 10 heurísticas na ordem canônica de Nielsen. H5 e H9 têm `questionKey` mas exigem
 * tratamento especial — ver `prevencao()` e o comentário em H5/H9 abaixo — os demais
 * itens `measured: true` são uma média Likert direta (`mediaLikert`).
 */
export const HEURISTICS: readonly HeuristicDefinition[] = [
	{
		id: "H1",
		name: "Visibilidade do status do sistema",
		measured: true,
		questionKey: "system_feedback",
	},
	{
		id: "H2",
		name: "Correspondência com o mundo real",
		measured: true,
		questionKey: "terms_clarity",
	},
	{
		id: "H3",
		name: "Controle e liberdade do usuário",
		measured: true,
		questionKey: "orientation",
	},
	{
		id: "H4",
		name: "Consistência e padrões",
		measured: true,
		questionKey: "consistency",
	},
	{
		id: "H5",
		name: "Prevenção de erros",
		measured: true,
		// não é uma média Likert — ver `prevencao()`, que consome `error_occurred`
		// diretamente, e `error_recovery` (mesma pergunta de H9) para a parte condicional
		questionKey: "error_occurred",
	},
	{
		id: "H6",
		name: "Reconhecimento em vez de memorização",
		measured: true,
		questionKey: "memory_load",
	},
	{
		id: "H7",
		name: "Flexibilidade e eficiência de uso",
		measured: false,
		reason:
			"Medição objetiva (tempo ativo por tarefa, já reportado nas tabelas de Eficiência) — a heurística trata de atalhos para usuários experientes, e como cada participante faz uma única sessão, não há base de comparação para avaliar isso.",
	},
	{
		id: "H8",
		name: "Design estético e minimalista",
		measured: true,
		questionKey: "visual_clarity",
	},
	{
		id: "H9",
		name: "Ajudar a reconhecer, diagnosticar e recuperar-se de erros",
		measured: true,
		// condicional: só respondida quando error_occurred = "YES" (depends_on no protocolo)
		questionKey: "error_recovery",
	},
	{
		id: "H10",
		name: "Ajuda e documentação",
		measured: false,
		reason:
			"Não avaliada — o sistema não disponibiliza central de ajuda, tela de dúvidas ou documentação ao usuário na versão avaliada.",
	},
] as const;

/**
 * Média bruta de 1 a 5 de um conjunto de respostas Likert (`answers.valueNumber`).
 * Reaproveitada por H1-H4, H6, H8, a parte condicional de H9, e pelos itens de domínio
 * (`personal_value`, `chain_value`) — mesmo formato de dado (escala de concordância de 5
 * pontos), mesma conta. Nunca converte para percentual — decisão desta sessão: uma
 * média Likert exibida como "72,5%" é ambígua ("72,5% de quê?"); a média bruta 1-5 (ou
 * uma barra segmentada de 5 pontos na UI) é o formato correto.
 */
export function mediaLikert(valores: ReadonlyArray<number>): number {
	if (valores.length === 0) return 0;
	return valores.reduce((sum, valor) => sum + valor, 0) / valores.length;
}

export interface PrevencaoErros {
	/** Suítes concluídas com `error_occurred = "NO"`. */
	semErro: number;
	/** Total de suítes com a pergunta `error_occurred` respondida. */
	total: number;
	/** Proporção real de contagem — 0-1. Ao contrário de `mediaLikert`, ISTO é uma % legítima. */
	percentual: number;
}

/**
 * H5 (Prevenção de erros) é relatada em duas partes, não uma nota combinada.
 *
 * Decisão explícita do usuário durante o design: a pergunta `error_occurred` (Sim/Não)
 * mede FREQUÊNCIA de um evento — quantas suítes tiveram erro — não concordância. Tratar
 * isso como Likert e emitir uma % "normalizada" (como as outras heurísticas) responde à
 * pergunta errada: "86,4%" de uma frequência é uma proporção legítima e sem ambiguidade;
 * "86,4%" de uma média Likert seria "86,4% de quê?" — problema real identificado e
 * corrigido no dashboard antes desta implementação.
 *
 * Consumo esperado:
 *  1. `prevencao(errorOccurredAnswers)` — a % real de suítes sem erro (esta função).
 *  2. `mediaLikert(recoveryValues)` sobre as respostas de `error_recovery` (mesma
 *     pergunta usada por H9, filtrada às suítes que TIVERAM erro) — a nota de
 *     recuperação, mostrada como escala Likert (nunca como %).
 */
export function prevencao(
	errorOccurredAnswers: ReadonlyArray<"YES" | "NO">,
): PrevencaoErros {
	const total = errorOccurredAnswers.length;
	const semErro = errorOccurredAnswers.filter((valor) => valor === "NO").length;
	return { semErro, total, percentual: total === 0 ? 0 : semErro / total };
}
