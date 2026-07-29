import type {
	HeuristicDefinition,
	PrevencaoErros,
} from "@survey/db/metrics/index";
import { HEURISTICS, mediaLikert, prevencao } from "@survey/db/metrics/index";
import type { DateRange, Repositories } from "@survey/db/repositories/index";

export type HeuristicResult =
	| { id: string; name: string; measured: true; mediaBruta: number; n: number }
	| {
			id: "H5";
			name: string;
			measured: true;
			prevencao: PrevencaoErros;
			recuperacao: { mediaBruta: number; n: number };
	  }
	| { id: string; name: string; measured: false; reason: string };

/**
 * Alimenta os 10 cards de heurística de Nielsen. A lista e a cobertura vêm de
 * `HEURISTICS` (`@survey/db/metrics`) — este use-case só busca as respostas e aplica
 * as fórmulas, nunca redefine quais heurísticas existem ou por que faltam duas.
 */
export async function getHeuristics(
	repositories: Repositories,
	range: DateRange,
): Promise<HeuristicResult[]> {
	const protocolVersionId =
		await repositories.protocol.getActiveProtocolVersionId();

	// H5 e H9 dependem das mesmas duas perguntas (error_occurred/error_recovery); as
	// demais heurísticas medidas têm cada uma sua própria pergunta direta.
	const directKeys = HEURISTICS.filter(
		(h): h is HeuristicDefinition & { measured: true } =>
			h.measured && h.id !== "H5" && h.id !== "H9",
	).map((h) => h.questionKey);

	const [errorOccurredAnswers, errorRecoveryAnswers, directAnswerSets] =
		await Promise.all([
			repositories.answers.findByQuestionKey(
				protocolVersionId,
				"error_occurred",
				range,
			),
			repositories.answers.findByQuestionKey(
				protocolVersionId,
				"error_recovery",
				range,
			),
			Promise.all(
				directKeys.map((key) =>
					repositories.answers.findByQuestionKey(protocolVersionId, key, range),
				),
			),
		]);

	const valuesByQuestionKey = new Map<string, number[]>(
		directKeys.map((key, index) => [
			key,
			(directAnswerSets[index] ?? [])
				.map((answer) => answer.valueNumber)
				.filter((value): value is number => value !== null),
		]),
	);

	const occurredValues = errorOccurredAnswers
		.map((answer) => answer.valueText)
		.filter(
			(value): value is "YES" | "NO" => value === "YES" || value === "NO",
		);
	const recoveryValues = errorRecoveryAnswers
		.map((answer) => answer.valueNumber)
		.filter((value): value is number => value !== null);

	return HEURISTICS.map((heuristic): HeuristicResult => {
		if (!heuristic.measured) {
			return {
				id: heuristic.id,
				name: heuristic.name,
				measured: false,
				reason: heuristic.reason,
			};
		}

		if (heuristic.id === "H5") {
			return {
				id: "H5",
				name: heuristic.name,
				measured: true,
				prevencao: prevencao(occurredValues),
				recuperacao: {
					mediaBruta: mediaLikert(recoveryValues),
					n: recoveryValues.length,
				},
			};
		}

		if (heuristic.id === "H9") {
			return {
				id: "H9",
				name: heuristic.name,
				measured: true,
				mediaBruta: mediaLikert(recoveryValues),
				n: recoveryValues.length,
			};
		}

		const values = valuesByQuestionKey.get(heuristic.questionKey) ?? [];
		return {
			id: heuristic.id,
			name: heuristic.name,
			measured: true,
			mediaBruta: mediaLikert(values),
			n: values.length,
		};
	});
}
