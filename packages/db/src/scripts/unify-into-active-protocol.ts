import "../load-env";

import { randomUUID } from "node:crypto";

import { env } from "@survey/env/server";
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { createDb } from "../index";
import {
	answers,
	events,
	personaDefs,
	personaSuites,
	protocolVersions,
	questions,
	sessions,
	suiteDefs,
	suiteRuns,
	taskDefs,
	taskRuns,
} from "../schema";

/**
 * Unifica a coleta na versão ativa do protocolo. Sessões concluídas de versões
 * anteriores passam a apontar para a versão ativa, remapeadas por código de suíte e de
 * tarefa e por chave de pergunta. Sessões não concluídas e sessões que não percorreram
 * todas as tarefas da versão ativa são removidas, assim como as versões antigas que
 * ficarem sem nenhuma sessão.
 *
 * Roda em qualquer ambiente. Fora de localhost exige `UNIFY_ALLOW_REMOTE=1`, porque
 * apaga dado de participante real sem possibilidade de desfazer.
 */

const PROTOCOL_KEY = "oikos-walkthrough";

if (
	!env.DATABASE_URL.includes("localhost") &&
	process.env.UNIFY_ALLOW_REMOTE !== "1"
) {
	throw new Error(
		"DATABASE_URL não aponta pra localhost. Rode com UNIFY_ALLOW_REMOTE=1 só depois de ter backup, porque este script apaga dados.",
	);
}

const db = createDb();

const [target] = await db
	.select({ id: protocolVersions.id, version: protocolVersions.version })
	.from(protocolVersions)
	.where(
		and(
			eq(protocolVersions.key, PROTOCOL_KEY),
			eq(protocolVersions.isActive, true),
		),
	)
	.orderBy(asc(protocolVersions.version));

if (!target)
	throw new Error(
		`Nenhuma versão ativa de "${PROTOCOL_KEY}". Rode "bun run db:seed" antes.`,
	);

const targetTasks = await db
	.select({
		taskId: taskDefs.id,
		taskCode: taskDefs.code,
		position: taskDefs.position,
		suiteId: suiteDefs.id,
		suiteCode: suiteDefs.code,
	})
	.from(taskDefs)
	.innerJoin(suiteDefs, eq(suiteDefs.id, taskDefs.suiteId))
	.where(eq(suiteDefs.protocolVersionId, target.id))
	.orderBy(asc(suiteDefs.code), asc(taskDefs.position));
const targetTaskByCode = new Map(targetTasks.map((t) => [t.taskCode, t]));

const targetQuestions = await db
	.select({
		id: questions.id,
		key: questions.key,
		scope: questions.scope,
		type: questions.type,
	})
	.from(questions)
	.where(eq(questions.protocolVersionId, target.id));
const targetQuestionByKey = new Map(targetQuestions.map((q) => [q.key, q]));

const legacyQuestions = await db
	.select({ id: questions.id, key: questions.key })
	.from(questions)
	.where(ne(questions.protocolVersionId, target.id));
const legacyQuestionKeyById = new Map(
	legacyQuestions.map((q) => [q.id, q.key]),
);

interface AnswerValue {
	valueNumber: number | null;
	valueText: string | null;
}

/** Combina as respostas de várias suítes antigas numa única resposta da suíte nova. */
function combineAnswers(type: string, values: AnswerValue[]): AnswerValue {
	if (type === "SCALE") {
		const numbers = values
			.map((v) => v.valueNumber)
			.filter((n): n is number => n !== null);
		if (numbers.length === 0) return { valueNumber: null, valueText: null };
		const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
		return { valueNumber: Math.round(mean), valueText: null };
	}
	const texts = values
		.map((v) => v.valueText)
		.filter((t): t is string => t !== null && t !== "");
	if (type === "CHOICE") {
		return {
			valueNumber: null,
			valueText: texts.includes("YES") ? "YES" : (texts[0] ?? null),
		};
	}
	return {
		valueNumber: null,
		valueText: texts.length > 0 ? texts.join("\n\n") : null,
	};
}

async function deleteSessions(ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	await db.transaction(async (tx) => {
		const runs = await tx
			.select({ id: suiteRuns.id })
			.from(suiteRuns)
			.where(inArray(suiteRuns.sessionId, ids));
		const runIds = runs.map((r) => r.id);
		await tx.delete(answers).where(inArray(answers.sessionId, ids));
		await tx.delete(events).where(inArray(events.sessionId, ids));
		if (runIds.length > 0) {
			await tx.delete(taskRuns).where(inArray(taskRuns.suiteRunId, runIds));
			await tx.delete(suiteRuns).where(inArray(suiteRuns.id, runIds));
		}
		await tx.delete(sessions).where(inArray(sessions.id, ids));
	});
}

const incomplete = await db
	.select({ id: sessions.id })
	.from(sessions)
	.where(ne(sessions.status, "COMPLETED"));
await deleteSessions(incomplete.map((s) => s.id));

const legacySessions = await db
	.select()
	.from(sessions)
	.where(ne(sessions.protocolVersionId, target.id));

let migradas = 0;
let removidas = 0;
const resumo: string[] = [];

for (const session of legacySessions) {
	const sourceRuns = await db
		.select({
			id: suiteRuns.id,
			code: suiteDefs.code,
			wallMs: suiteRuns.wallMs,
		})
		.from(suiteRuns)
		.innerJoin(suiteDefs, eq(suiteDefs.id, suiteRuns.suiteId))
		.where(eq(suiteRuns.sessionId, session.id));
	const sourceRunIds = sourceRuns.map((r) => r.id);

	const sourceTasks =
		sourceRunIds.length === 0
			? []
			: await db
					.select({
						id: taskRuns.id,
						suiteRunId: taskRuns.suiteRunId,
						code: taskDefs.code,
						startedAt: taskRuns.startedAt,
						finishedAt: taskRuns.finishedAt,
						activeMs: taskRuns.activeMs,
						outcome: taskRuns.outcome,
					})
					.from(taskRuns)
					.innerJoin(taskDefs, eq(taskDefs.id, taskRuns.taskId))
					.where(inArray(taskRuns.suiteRunId, sourceRunIds));

	const kept = sourceTasks.filter((t) => targetTaskByCode.has(t.code));
	const keptCodes = new Set<string>(kept.map((t) => t.code));

	// Sessão que não percorreu todas as tarefas da versão ativa fica fora da coleta:
	// completar as ausentes seria inventar resultado.
	if (keptCodes.size !== targetTaskByCode.size) {
		await deleteSessions([session.id]);
		removidas++;
		resumo.push(
			`${session.participantCode}: removida, ${keptCodes.size} de ${targetTaskByCode.size} tarefas`,
		);
		continue;
	}

	await db.transaction(async (tx) => {
		const contributingRunIds = new Set(kept.map((t) => t.suiteRunId));
		const contributingRuns = sourceRuns.filter((r) =>
			contributingRunIds.has(r.id),
		);
		const contributingCodes = new Set<string>(
			contributingRuns.map((r) => r.code),
		);

		const bySuite = new Map<string, typeof kept>();
		for (const task of kept) {
			const suiteId = targetTaskByCode.get(task.code)?.suiteId;
			if (!suiteId) continue;
			const list = bySuite.get(suiteId) ?? [];
			list.push(task);
			bySuite.set(suiteId, list);
		}

		const newRunIdBySuiteId = new Map<string, string>();
		let position = 0;
		for (const [suiteId, tasks] of bySuite) {
			const startedAt = new Date(
				Math.min(...tasks.map((t) => t.startedAt.getTime())),
			);
			const finishedTimes = tasks
				.map((t) => t.finishedAt?.getTime())
				.filter((t): t is number => t !== undefined);
			const finishedAt =
				finishedTimes.length > 0
					? new Date(Math.max(...finishedTimes))
					: (session.finishedAt ?? startedAt);
			const activeMs = tasks.reduce((sum, t) => sum + t.activeMs, 0);
			const wallMs = contributingRuns.reduce((sum, r) => sum + r.wallMs, 0);

			const outcomes = tasks.map((t) => t.outcome).filter((o) => o !== null);
			const yes = outcomes.filter((o) => o === "YES").length;
			const outcome =
				outcomes.length === 0
					? null
					: yes === outcomes.length
						? "YES"
						: yes === 0
							? "NO"
							: "PARTIAL";

			const newRunId = randomUUID();
			newRunIdBySuiteId.set(suiteId, newRunId);
			await tx.insert(suiteRuns).values({
				id: newRunId,
				sessionId: session.id,
				suiteId,
				position: position++,
				startedAt,
				finishedAt,
				activeMs,
				wallMs,
				outcome,
			});

			for (const task of tasks) {
				const t = targetTaskByCode.get(task.code);
				if (!t) continue;
				await tx
					.update(taskRuns)
					.set({
						suiteRunId: newRunId,
						taskId: t.taskId,
						position: t.position,
					})
					.where(eq(taskRuns.id, task.id));
			}
		}

		const firstRunId = [...newRunIdBySuiteId.values()][0];
		const sourceAnswers =
			sourceRunIds.length === 0
				? []
				: await tx
						.select({
							suiteRunId: answers.suiteRunId,
							questionId: answers.questionId,
							valueNumber: answers.valueNumber,
							valueText: answers.valueText,
							createdAt: answers.createdAt,
						})
						.from(answers)
						.where(
							and(
								eq(answers.sessionId, session.id),
								inArray(answers.suiteRunId, sourceRunIds),
							),
						);

		const answersByKey = new Map<string, typeof sourceAnswers>();
		for (const answer of sourceAnswers) {
			if (!answer.suiteRunId || !contributingRunIds.has(answer.suiteRunId))
				continue;
			const key = legacyQuestionKeyById.get(answer.questionId);
			if (!key) continue;
			const list = answersByKey.get(key) ?? [];
			list.push(answer);
			answersByKey.set(key, list);
		}

		await tx
			.delete(answers)
			.where(
				and(
					eq(answers.sessionId, session.id),
					inArray(answers.suiteRunId, sourceRunIds),
				),
			);

		if (firstRunId) {
			for (const [key, list] of answersByKey) {
				const question = targetQuestionByKey.get(key);
				if (!question || question.scope !== "PER_SUITE") continue;
				const combined = combineAnswers(question.type, list);
				await tx.insert(answers).values({
					id: randomUUID(),
					sessionId: session.id,
					suiteRunId: firstRunId,
					questionId: question.id,
					valueNumber: combined.valueNumber,
					valueText: combined.valueText,
					createdAt: new Date(
						Math.min(...list.map((a) => a.createdAt.getTime())),
					),
				});
			}
		}

		const finalAnswers = await tx
			.select({ id: answers.id, questionId: answers.questionId })
			.from(answers)
			.where(
				and(eq(answers.sessionId, session.id), isNull(answers.suiteRunId)),
			);
		for (const answer of finalAnswers) {
			const key = legacyQuestionKeyById.get(answer.questionId);
			if (!key) continue;
			const question = targetQuestionByKey.get(key);
			if (question) {
				await tx
					.update(answers)
					.set({ questionId: question.id })
					.where(eq(answers.id, answer.id));
			} else {
				await tx.delete(answers).where(eq(answers.id, answer.id));
			}
		}

		const sessionEvents = await tx
			.select({
				id: events.id,
				suiteCode: events.suiteCode,
				taskCode: events.taskCode,
			})
			.from(events)
			.where(eq(events.sessionId, session.id));
		const dropIds: string[] = [];
		for (const event of sessionEvents) {
			if (event.suiteCode === null) continue;
			const keepsTask =
				event.taskCode !== null && keptCodes.has(event.taskCode);
			const keepsSuite =
				event.taskCode === null && contributingCodes.has(event.suiteCode);
			if (keepsTask) {
				const suiteCode = targetTaskByCode.get(
					event.taskCode as string,
				)?.suiteCode;
				if (suiteCode && suiteCode !== event.suiteCode) {
					await tx
						.update(events)
						.set({ suiteCode })
						.where(eq(events.id, event.id));
				}
			} else if (!keepsSuite) {
				dropIds.push(event.id);
			}
		}
		if (dropIds.length > 0)
			await tx.delete(events).where(inArray(events.id, dropIds));

		const keptIds = kept.map((t) => t.id);
		const droppedTaskIds = sourceTasks
			.filter((t) => !keptIds.includes(t.id))
			.map((t) => t.id);
		if (droppedTaskIds.length > 0)
			await tx.delete(taskRuns).where(inArray(taskRuns.id, droppedTaskIds));
		if (sourceRunIds.length > 0)
			await tx.delete(suiteRuns).where(inArray(suiteRuns.id, sourceRunIds));

		await tx
			.update(sessions)
			.set({ protocolVersionId: target.id })
			.where(eq(sessions.id, session.id));

		migradas++;
		resumo.push(
			`${session.participantCode}: migrada, ${keptCodes.size} tarefas`,
		);
	});
}

const emptyVersions = await db
	.select({ id: protocolVersions.id, version: protocolVersions.version })
	.from(protocolVersions)
	.where(
		and(
			eq(protocolVersions.key, PROTOCOL_KEY),
			ne(protocolVersions.id, target.id),
		),
	);

let versoesRemovidas = 0;
for (const version of emptyVersions) {
	const [used] = await db
		.select({ id: sessions.id })
		.from(sessions)
		.where(eq(sessions.protocolVersionId, version.id))
		.limit(1);
	if (used) continue;

	await db.transaction(async (tx) => {
		const suites = await tx
			.select({ id: suiteDefs.id })
			.from(suiteDefs)
			.where(eq(suiteDefs.protocolVersionId, version.id));
		const suiteIds = suites.map((s) => s.id);
		const personas = await tx
			.select({ id: personaDefs.id })
			.from(personaDefs)
			.where(eq(personaDefs.protocolVersionId, version.id));
		const personaIds = personas.map((p) => p.id);

		if (personaIds.length > 0)
			await tx
				.delete(personaSuites)
				.where(inArray(personaSuites.personaId, personaIds));
		if (suiteIds.length > 0) {
			await tx.delete(taskDefs).where(inArray(taskDefs.suiteId, suiteIds));
			await tx.delete(suiteDefs).where(inArray(suiteDefs.id, suiteIds));
		}
		await tx
			.delete(personaDefs)
			.where(eq(personaDefs.protocolVersionId, version.id));
		await tx
			.delete(questions)
			.where(eq(questions.protocolVersionId, version.id));
		await tx
			.delete(protocolVersions)
			.where(eq(protocolVersions.id, version.id));
	});
	versoesRemovidas++;
}

console.log(
	`Versão ativa: v${target.version}. Sessões migradas: ${migradas}. Sessões removidas: ${removidas + incomplete.length} (${incomplete.length} não concluídas). Versões antigas removidas: ${versoesRemovidas}.`,
);
for (const linha of resumo) console.log(`  ${linha}`);

process.exit(0);
