export interface EficienciaBounds {
	/** Menor `activeMs` observado na mesma granularidade da amostra (ver nota abaixo). */
	min: number;
	/** Maior `activeMs` observado na mesma granularidade da amostra. */
	max: number;
}

/**
 * Eficiência (Tf) — taxa de tempo ativo, normalizada para 0-1.
 *
 * Fórmula literal de Lima, Oliveira & Santana (2013): `Tf = 1 − tmed/(tmax−tmin)`. O
 * mecanismo que faz isso funcionar sem precisar de conversão de unidade: `tmed` e
 * `(tmax−tmin)` estão ambos em milissegundos, então a divisão cancela a unidade e sobra
 * um número puro — não é "tempo virando percentual", é uma razão entre duas durações.
 *
 * `bounds.min`/`bounds.max` PRECISAM vir da mesma granularidade da amostra que está
 * sendo calculada: ao computar Tf de uma suíte, `bounds` tem que ser o menor/maior
 * `activeMs` observado entre EXECUÇÕES DE SUÍTE (nunca de tarefa); ao computar Tf de uma
 * tarefa, o oposto. Misturar as duas escalas foi um erro real cometido durante o design
 * deste dashboard — o Nível de Usabilidade e as heurísticas dependem de Tf estar na
 * escala certa pra fazer sentido.
 *
 * A fórmula original não é limitada a [0,1] quando `tmed` se aproxima de `tmax` com
 * `tmin > 0` (o resultado pode passar de 1 ou ficar negativo) — é uma simplificação do
 * artigo original, que só fecha perfeitamente quando `tmin = 0`. Como este dashboard usa
 * `tmin`/`tmax` observados (não teóricos), o resultado é limitado a [0,1] aqui para que
 * o consumidor da API nunca receba uma "eficiência" fora de escala.
 */
export function eficiencia(
	activeMsList: ReadonlyArray<number>,
	bounds: EficienciaBounds,
): number {
	if (activeMsList.length === 0) return 0;
	const tmed =
		activeMsList.reduce((sum, ms) => sum + ms, 0) / activeMsList.length;
	const range = bounds.max - bounds.min;
	if (range <= 0) return 1;
	const raw = 1 - tmed / range;
	return Math.max(0, Math.min(1, raw));
}
