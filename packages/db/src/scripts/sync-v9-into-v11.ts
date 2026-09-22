import "../load-env";

import { randomUUID } from "node:crypto";
import { env } from "@survey/env/server";
import { and, asc, eq, inArray, isNull, like } from "drizzle-orm";
import { createDb } from "../index";
import {
	answers,
	events,
	protocolVersions,
	questions,
	sessions,
	suiteDefs,
	suiteRuns,
	taskDefs,
	taskRuns,
} from "../schema";

/**
 * Converte, no lugar, as sessões da v9 do "oikos-walkthrough" para a v11, como se o
 * participante tivesse executado a v11 desde o início. A sessão mantém id e código de
 * participante; só as tarefas que existem na v11 (suíte única S1) sobrevivem, e o
 * questionário pós-suíte da v11 recebe a média arredondada das suítes v9 que forneceram
 * essas tarefas. Tarefa da v11 que o participante nunca viu na v9 não ganha execução.
 */

const PROTOCOL_KEY = "oikos-walkthrough";
const LEGACY_SYNC_PREFIX = "V9SYNC-";

if (!env.DATABASE_URL.includes("localhost")) {
	throw new Error(
		`DATABASE_URL não aponta pra localhost (${env.DATABASE_URL}), abortando pra não arriscar rodar isso em produção.`,
	);
}

const db = createDb();

async function protocolVersionId(version: number) {
	const [row] = await db
		.select({ id: protocolVersions.id })
		.from(protocolVersions)
		.where(
			and(
				eq(protocolVersions.key, PROTOCOL_KEY),
				eq(protocolVersions.version, version),
			),
		);
	if (!row)
		throw new Error(
			`Protocol version ${version} de "${PROTOCOL_KEY}" não encontrada.`,
		);
	return row.id;
}

const v9Id = await protocolVersionId(9);
const v11Id = await protocolVersionId(11);

const [v11Suite] = await db
	.select({ id: suiteDefs.id, code: suiteDefs.code })
	.from(suiteDefs)
	.where(and(eq(suiteDefs.protocolVersionId, v11Id), eq(suiteDefs.code, "S1")));
if (!v11Suite) throw new Error('Suíte "S1" não encontrada na v11.');

const v11Tasks = await db
	.select({ id: taskDefs.id, code: taskDefs.code })
	.from(taskDefs)
	.where(eq(taskDefs.suiteId, v11Suite.id))
	.orderBy(asc(taskDefs.position));
const v11TaskByCode = new Map(
	v11Tasks.map((task, position) => [task.code, { id: task.id, position }]),
);

const v9Questions = await db
	.select({ id: questions.id, key: questions.key })
	.from(questions)
	.where(eq(questions.protocolVersionId, v9Id));
const v9QuestionKeyById = new Map(v9Questions.map((q) => [q.id, q.key]));

const v11Questions = await db
	.select({
		id: questions.id,
		key: questions.key,
		scope: questions.scope,
		type: questions.type,
	})
	.from(questions)
	.where(eq(questions.protocolVersionId, v11Id));
const v11QuestionByKey = new Map(v11Questions.map((q) => [q.key, q]));

interface AnswerValue {
	valueNumber: number | null;
	valueText: string | null;
}

/** Combina as respostas de várias suítes v9 numa única resposta da suíte v11. */
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

const legacySessions = await db
	.select({ id: sessions.id })
	.from(sessions)
	.where(like(sessions.participantCode, `${LEGACY_SYNC_PREFIX}%`));

if (legacySessions.length > 0) {
	const ids = legacySessions.map((s) => s.id);
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
	console.log(
		`Removidas ${legacySessions.length} cópias "${LEGACY_SYNC_PREFIX}" da sincronização anterior.`,
	);
}

const v9Sessions = await db
	.select()
	.from(sessions)
	.where(eq(sessions.protocolVersionId, v9Id));

let converted = 0;
let keptTaskRuns = 0;
const summary: string[] = [];

for (const session of v9Sessions) {
	await db.transaction(async (tx) => {
		const sourceRuns = await tx
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
				: await tx
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

		const shared = sourceTasks.filter((t) => v11TaskByCode.has(t.code));
		const sharedCodes = new Set<string>(shared.map((t) => t.code));
		if (sharedCodes.size !== shared.length) {
			throw new Error(
				`Sessão ${session.participantCode} tem tarefa da v11 repetida em mais de uma suíte v9.`,
			);
		}

		const contributingRunIds = new Set(shared.map((t) => t.suiteRunId));
		const contributingRuns = sourceRuns.filter((r) =>
			contributingRunIds.has(r.id),
		);
		const contributingCodes = new Set<string>(
			contributingRuns.map((r) => r.code),
		);

		const startedAt =
			shared.length > 0
				? new Date(Math.min(...shared.map((t) => t.startedAt.getTime())))
				: session.startedAt;
		const finishedTimes = shared
			.map((t) => t.finishedAt?.getTime())
			.filter((t): t is number => t !== undefined);
		const finishedAt =
			finishedTimes.length > 0
				? new Date(Math.max(...finishedTimes))
				: (session.finishedAt ?? startedAt);
		const activeMs = shared.reduce((sum, t) => sum + t.activeMs, 0);
		const wallMs = contributingRuns.reduce((sum, r) => sum + r.wallMs, 0);

		const outcomes = shared.map((t) => t.outcome).filter((o) => o !== null);
		const yes = outcomes.filter((o) => o === "YES").length;
		const suiteOutcome =
			outcomes.length === 0
				? null
				: yes === outcomes.length
					? "YES"
					: yes === 0
						? "NO"
						: "PARTIAL";

		const newRunId = randomUUID();
		await tx.insert(suiteRuns).values({
			id: newRunId,
			sessionId: session.id,
			suiteId: v11Suite.id,
			position: 0,
			startedAt,
			finishedAt,
			activeMs,
			wallMs,
			outcome: suiteOutcome,
		});

		for (const task of shared) {
			const target = v11TaskByCode.get(task.code);
			if (!target) continue;
			await tx
				.update(taskRuns)
				.set({
					suiteRunId: newRunId,
					taskId: target.id,
					position: target.position,
				})
				.where(eq(taskRuns.id, task.id));
		}

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
			const key = v9QuestionKeyById.get(answer.questionId);
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

		for (const [key, list] of answersByKey) {
			const target = v11QuestionByKey.get(key);
			if (!target || target.scope !== "PER_SUITE") continue;
			const combined = combineAnswers(target.type, list);
			await tx.insert(answers).values({
				id: randomUUID(),
				sessionId: session.id,
				suiteRunId: newRunId,
				questionId: target.id,
				valueNumber: combined.valueNumber,
				valueText: combined.valueText,
				createdAt: new Date(
					Math.min(...list.map((a) => a.createdAt.getTime())),
				),
			});
		}

		const finalAnswers = await tx
			.select({ id: answers.id, questionId: answers.questionId })
			.from(answers)
			.where(
				and(eq(answers.sessionId, session.id), isNull(answers.suiteRunId)),
			);
		for (const answer of finalAnswers) {
			const key = v9QuestionKeyById.get(answer.questionId);
			const target = key ? v11QuestionByKey.get(key) : undefined;
			if (target) {
				await tx
					.update(answers)
					.set({ questionId: target.id })
					.where(eq(answers.id, answer.id));
			} else if (key) {
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
		const remapIds: string[] = [];
		const dropIds: string[] = [];
		for (const event of sessionEvents) {
			if (event.suiteCode === null) continue;
			const keepsTask =
				event.taskCode !== null && sharedCodes.has(event.taskCode);
			const keepsSuite =
				event.taskCode === null && contributingCodes.has(event.suiteCode);
			if (keepsTask || keepsSuite) remapIds.push(event.id);
			else dropIds.push(event.id);
		}
		if (remapIds.length > 0)
			await tx
				.update(events)
				.set({ suiteCode: "S1" })
				.where(inArray(events.id, remapIds));
		if (dropIds.length > 0)
			await tx.delete(events).where(inArray(events.id, dropIds));

		const sharedIds = shared.map((t) => t.id);
		const droppedTaskIds = sourceTasks
			.filter((t) => !sharedIds.includes(t.id))
			.map((t) => t.id);
		if (droppedTaskIds.length > 0)
			await tx.delete(taskRuns).where(inArray(taskRuns.id, droppedTaskIds));
		if (sourceRunIds.length > 0)
			await tx.delete(suiteRuns).where(inArray(suiteRuns.id, sourceRunIds));

		await tx
			.update(sessions)
			.set({ protocolVersionId: v11Id, activeMs, wallMs })
			.where(eq(sessions.id, session.id));

		converted++;
		keptTaskRuns += shared.length;
		const missing = v11Tasks
			.filter((t) => !sharedCodes.has(t.code))
			.map((t) => t.code);
		summary.push(
			`${session.participantCode}: ${shared.length}/8 tarefas, suítes v9 ${[...contributingCodes].join("+")}${
				missing.length > 0 ? `, sem execução: ${missing.join(", ")}` : ""
			}`,
		);
	});
}

console.log(
	`Convertidas ${converted} sessões da v9 para a v11 (${keptTaskRuns} task_runs mantidas).`,
);
for (const line of summary) console.log(`  ${line}`);

process.exit(0);
