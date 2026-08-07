import { randomUUID } from "node:crypto";

import { and, eq, inArray, isNull } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import type { Option } from "../protocol/types";
import { answers, sessions, suiteRuns } from "../schema/collection";
import type * as schema from "../schema/index";
import { questions } from "../schema/protocol";
import { type DateRange, dateRangeFilter } from "./date-range";

type Db = MySql2Database<typeof schema>;

export interface FinalAnswerInput {
	questionId: string;
	valueText?: string;
	valueNumber?: number;
}

export interface AnswerRow {
	sessionId: string;
	suiteRunId: string | null;
	suiteId: string | null;
	valueNumber: number | null;
	valueText: string | null;
}

export interface SuiteAnswerRow {
	suiteRunId: string | null;
	questionKey: string;
	questionLabel: string;
	questionType: string;
	position: number;
	options: Option[] | null;
	valueNumber: number | null;
	valueText: string | null;
}

export interface CommentRow {
	persona: string;
	participantCode: string;
	comment: string | null;
}

/** Acesso a `usability_answers` — leitura para o painel, escrita para E4 (fim de sessão). */
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

	/**
	 * Respostas pós-etapa das suítes informadas, já com a definição da pergunta
	 * (rótulo, tipo, opções) para o painel resolver valor→rótulo sem uma segunda ida.
	 * Uma consulta para todas as suítes da sessão: a matriz comparativa precisa das
	 * três de uma vez.
	 */
	async findBySuiteRunIds(suiteRunIds: string[]): Promise<SuiteAnswerRow[]> {
		if (suiteRunIds.length === 0) return [];

		return this.db
			.select({
				suiteRunId: answers.suiteRunId,
				questionKey: questions.key,
				questionLabel: questions.label,
				questionType: questions.type,
				position: questions.position,
				options: questions.options,
				valueNumber: answers.valueNumber,
				valueText: answers.valueText,
			})
			.from(answers)
			.innerJoin(questions, eq(answers.questionId, questions.id))
			.where(inArray(answers.suiteRunId, suiteRunIds))
			.orderBy(questions.position);
	}

	/** O comentário livre (se houver) de UMA sessão específica — painel de testador. */
	async findFreeCommentBySessionId(
		protocolVersionId: string,
		sessionId: string,
	): Promise<string | null> {
		const [row] = await this.db
			.select({ comment: answers.valueText })
			.from(answers)
			.innerJoin(questions, eq(answers.questionId, questions.id))
			.where(
				and(
					eq(questions.protocolVersionId, protocolVersionId),
					eq(questions.key, "free_comment"),
					eq(answers.sessionId, sessionId),
				),
			);
		return row?.comment?.trim() || null;
	}

	/**
	 * Grava as respostas de fim de sessão (`suite_run_id` nulo) de uma sessão (E4),
	 * substituindo só as perguntas reenviadas.
	 *
	 * Delete-then-insert, não upsert linha a linha: o índice único
	 * `answers_session_run_question` não protege esse caso, porque em MySQL nulos não
	 * colidem entre si — duas gravações de fim de sessão passariam pela constraint sem
	 * conflito nenhum (ver a nota em `schema/collection.ts`). Apagar antes de gravar é o
	 * que garante que reenviar E4 não duplica; o delete é escopado às perguntas do
	 * payload para preservar respostas finais de um envio anterior, e `finish` vazio
	 * não toca em nada (guarda antes de qualquer escrita).
	 */
	async upsertFinalAnswers(
		sessionId: string,
		rows: FinalAnswerInput[],
	): Promise<void> {
		if (rows.length === 0) return;

		const questionIds = [...new Set(rows.map((row) => row.questionId))];

		await this.db.transaction(async (tx) => {
			await tx
				.delete(answers)
				.where(
					and(
						eq(answers.sessionId, sessionId),
						isNull(answers.suiteRunId),
						inArray(answers.questionId, questionIds),
					),
				);

			await tx.insert(answers).values(
				rows.map((row) => ({
					id: randomUUID(),
					sessionId,
					suiteRunId: null,
					...row,
				})),
			);
		});
	}
}
