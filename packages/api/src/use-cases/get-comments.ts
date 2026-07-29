import type { DateRange, Repositories } from "@survey/db/repositories/index";

/**
 * Comentários livres (`free_comment`) não vazios, no período — o único dado textual
 * sobrando no instrumento. Sem agregação: é uma listagem, não uma métrica.
 */
export async function getComments(
	repositories: Repositories,
	range: DateRange,
): Promise<string[]> {
	const protocolVersionId =
		await repositories.protocol.getActiveProtocolVersionId();
	const answers = await repositories.answers.findByQuestionKey(
		protocolVersionId,
		"free_comment",
		range,
	);
	return answers
		.map((answer) => answer.valueText?.trim())
		.filter((text): text is string => Boolean(text));
}
