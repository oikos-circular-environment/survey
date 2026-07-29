import type { outcomes } from "../schema/enums";

export type Outcome = (typeof outcomes)[number];

/**
 * Eficácia (Te) — proporção de execuções concluídas com sucesso.
 *
 * ISO 9241-11 / Lima, Oliveira & Santana (2013): `Te = ΣTARc / ΣTAR` (tarefas
 * concluídas sobre tarefas tentadas). Aqui o `outcome` de uma execução (suíte ou
 * tarefa) vem inteiramente do detector automático do app — nunca é preenchido por um
 * avaliador presencial, diferente do instrumento original de Lima.
 *
 * `PARTIAL` não conta como sucesso. Decisão explícita do produto: tarefas com
 * `success.mode: "all"` (ex.: cadastrar um resíduo E um serviço) podem terminar com só
 * parte dos sinais disparados, e não existe meio-sucesso para quem depende do
 * resultado — expor a empresa nos pontos de coleta exige todas as etapas cadastradas,
 * "ou o usuário finaliza ou ele não consegue". Por isso o denominador conta toda
 * execução com `outcome` preenchido, e o numerador conta só `YES`.
 */
export function eficacia(outcomeList: ReadonlyArray<Outcome>): number {
	if (outcomeList.length === 0) return 0;
	const successes = outcomeList.filter((outcome) => outcome === "YES").length;
	return successes / outcomeList.length;
}
