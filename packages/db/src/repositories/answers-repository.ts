import { and, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import { answers, sessions, suiteRuns } from "../schema/collection";
import type * as schema from "../schema/index";
import { questions } from "../schema/protocol";
import { type DateRange, dateRangeFilter } from "./date-range";

type Db = MySql2Database<typeof schema>;

export interface AnswerRow {
	sessionId: string;
	suiteRunId: string | null;
	suiteId: string | null;
	valueNumber: number | null;
	valueText: string | null;
}

export interface CommentRow {
	persona: string;
	participantCode: number;
	comment: string | null;
}

/** Acesso de leitura a `usability_answers`. */
export class AnswersRepository {
	constructor(private readonly db: Db) {}

	/**
	 * Respostas para uma `questions.key` específica, no período. `suiteId` vem de um
	 * join opcional (esquerdo, via `suiteRunId`) — nulo para perguntas de escopo
	 * `FINAL` (`suiteRunId` é sempre nulo nelas) ou quando a suíte de origem não é
	 * relevante para quem consome.
	 */
	async findByQuestionKey(
		protocolVersionId: string,
		key: string,
		range: DateRange,
	): Promise<AnswerRow[]> {
		return this.db
			.select({
				sessionId: answers.sessionId,
				suiteRunId: answers.suiteRunId,
				suiteId: suiteRuns.suiteId,
				valueNumber: answers.valueNumber,
				valueText: answers.valueText,
			})
			.from(answers)
			.innerJoin(questions, eq(answers.questionId, questions.id))
			.innerJoin(sessions, eq(answers.sessionId, sessions.id))
			.leftJoin(suiteRuns, eq(answers.suiteRunId, suiteRuns.id))
			.where(
				and(
					eq(questions.protocolVersionId, protocolVersionId),
					eq(questions.key, key),
					dateRangeFilter(sessions.startedAt, range),
				),
			);
	}

	/**
	 * Respostas de `free_comment` (escopo FINAL) com a persona e o código do
	 * participante da sessão de origem — usado para dar contexto a cada comentário na
	 * tela "Comentários livres", sem expor nenhum dado identificável (o schema já
	 * garante isso: `sessions` não guarda nada além do código sequencial e da persona
	 * autodeclarada).
	 */
	async findCommentsWithContext(
		protocolVersionId: string,
		range: DateRange,
	): Promise<CommentRow[]> {
		return this.db
			.select({
				persona: sessions.persona,
				participantCode: sessions.participantCode,
				comment: answers.valueText,
			})
			.from(answers)
			.innerJoin(questions, eq(answers.questionId, questions.id))
			.innerJoin(sessions, eq(answers.sessionId, sessions.id))
			.where(
				and(
					eq(questions.protocolVersionId, protocolVersionId),
					eq(questions.key, "free_comment"),
					dateRangeFilter(sessions.startedAt, range),
				),
			);
	}
}
