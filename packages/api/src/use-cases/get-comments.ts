import type {
	DateRange,
	Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";

export interface CommentResult {
	persona: string;
	participantCode: string;
	comment: string;
}

/**
 * Comentários livres (`free_comment`) não vazios, no período — o único dado textual
 * sobrando no instrumento. Sem agregação: é uma listagem, não uma métrica. Cada
 * comentário vem com a persona (rótulo resolvido via `personaDefs`, mesma fonte que
 * `getPersonas` usa) e o código do participante (não identificável, só o
 * `participant_code` sequencial) para dar contexto, como no card de comentário
 * desenhado no Pencil (nó eYUgU).
 */
export async function getComments(
	repositories: Repositories,
	range: DateRange,
): Promise<CommentResult[]> {
	const protocolVersionId =
		await repositories.protocol.getLatestProtocolVersionId();
	const [rows, personaDefs] = await Promise.all([
		repositories.answers.findCommentsWithContext(protocolVersionId, range),
		repositories.protocol.getPersonaDefs(protocolVersionId),
	]);

	const labelByPersonaKey = new Map(
		personaDefs.map((persona) => [persona.key, persona.label]),
	);

	return rows
		.filter((row): row is typeof row & { comment: string } =>
			Boolean(row.comment?.trim()),
		)
		.map((row) => ({
			persona: labelByPersonaKey.get(row.persona) ?? row.persona,
			participantCode: row.participantCode,
			comment: row.comment.trim(),
		}));
}
