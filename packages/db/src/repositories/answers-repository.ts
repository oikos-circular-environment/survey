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
}
