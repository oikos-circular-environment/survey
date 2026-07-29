/**
 * Satisfação — média bruta de 1 a 5 das respostas à pergunta `satisfaction`.
 *
 * Este é o número que deve ser exibido ao usuário final da pesquisa (ex.: "3,8 / 5") —
 * é mais legível que uma taxa 0-1. Use `satisfacaoTaxa` só para compor o Nível de
 * Usabilidade, nunca para exibição direta.
 */
export function satisfacaoMedia(valores: ReadonlyArray<number>): number {
	if (valores.length === 0) return 0;
	return valores.reduce((sum, valor) => sum + valor, 0) / valores.length;
}

/**
 * Satisfação normalizada (Ts) — a média bruta 1-5 reescalada para 0-1, mesmo mecanismo
 * usado nas heurísticas Likert: `(média − 1) / 4`, onde 1 (mínimo da escala) vira 0 e 5
 * (máximo) vira 1. Só existe para compor `nivelDeUsabilidade({te, tf, ts})` — nunca
 * exibir este número isolado a um usuário, exibir sempre `satisfacaoMedia`.
 */
export function satisfacaoTaxa(mediaBruta: number): number {
	return (mediaBruta - 1) / 4;
}
