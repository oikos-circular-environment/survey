import { mediaLikert } from "@survey/db/metrics/index";
import type { DateRange, Repositories } from "@survey/db/repositories/index";

export interface DomainItemResult {
	key: string;
	label: string;
	mediaBruta: number;
	n: number;
}

const DOMAIN_ITEMS = [
	{
		key: "chain_value",
		label: "Ajudaria a conectar pessoas e empresas da reciclagem",
	},
	{
		key: "personal_value",
		label: "Resolveria um problema real do meu dia a dia",
	},
] as const;

/**
 * Itens de domínio (`personal_value`, `chain_value`) — utilidade percebida no
 * ecossistema de economia circular, não heurística de Nielsen. Mesmo tratamento de
 * `getHeuristics` para os itens diretos: média bruta 1-5, sem conversão para %.
 */
export async function getDomainItems(
	repositories: Repositories,
	range: DateRange,
): Promise<DomainItemResult[]> {
	const protocolVersionId =
		await repositories.protocol.getActiveProtocolVersionId();

	const answerSets = await Promise.all(
		DOMAIN_ITEMS.map((item) =>
			repositories.answers.findByQuestionKey(
				protocolVersionId,
				item.key,
				range,
			),
		),
	);

	return DOMAIN_ITEMS.map((item, index) => {
		const values = (answerSets[index] ?? [])
			.map((answer) => answer.valueNumber)
			.filter((value): value is number => value !== null);
		return {
			key: item.key,
			label: item.label,
			mediaBruta: mediaLikert(values),
			n: values.length,
		};
	});
}
