import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { protocol } from "../protocol/data";
import { answers, events, suiteRuns, taskRuns } from "../schema";
import { seedProtocol } from "../seed/seed";
import { rowCount } from "../testing/queries";
import { withEphemeralDatabase } from "../testing/suite";
import { insertFactorySession } from "./insert";
import {
	resolveSeededProtocol,
	type SeededProtocol,
} from "./resolve-seeded-protocol";
import { buildFactorySession } from "./session-factory";

/**
 * O mesmo código de tarefa aparece em mais de uma suíte (ex.: T8 em S1 e S6), então
 * localizar por `taskId` (a linha real de `taskDefs`, uma por suíte) é o que garante não
 * confundir a ocorrência de uma suíte com a de outra.
 */
function suiteAndTaskCodeOf(
	seeded: SeededProtocol,
	taskId: string,
): { suiteCode: string; taskCode: string } | undefined {
	for (const persona of seeded.personas) {
		for (const suite of persona.suites) {
			const task = suite.tasks.find((t) => t.id === taskId);
			if (task) return { suiteCode: suite.code, taskCode: task.code };
		}
	}
	return undefined;
}

describe("factories", () => {
	const getDb = withEphemeralDatabase();

	async function seededProtocol(): Promise<SeededProtocol> {
		const db = getDb();
		await seedProtocol(db, protocol);
		return resolveSeededProtocol(db, protocol.key, protocol.version);
	}

	test("sessão COMPLETED de uma persona de 3 etapas gera exatamente as suítes e tarefas do roteiro", async () => {
		const db = getDb();
		const seeded = await seededProtocol();

		const factory = buildFactorySession(seeded, {
			personaKey: "CITIZEN",
			status: "COMPLETED",
		});
		const { sessionId } = await insertFactorySession(db, factory);

		// CITIZEN: S1 (7) + S2 (3) + S6 (10) = 20 tarefas, em 3 suítes.
		expect(factory.suiteRuns).toHaveLength(3);
		expect(factory.taskRuns).toHaveLength(20);
		expect(factory.suiteRuns.every((run) => run.finishedAt !== undefined)).toBe(
			true,
		);

		const insertedTaskRuns = await db
			.select()
			.from(taskRuns)
			.innerJoin(suiteRuns, eq(taskRuns.suiteRunId, suiteRuns.id))
			.where(eq(suiteRuns.sessionId, sessionId));
		expect(insertedTaskRuns).toHaveLength(20);
	});

	test("outcome de cada tarefa é coerente com os eventos gravados", async () => {
		const seeded = await seededProtocol();
		const factory = buildFactorySession(seeded, {
			personaKey: "CITIZEN",
			status: "COMPLETED",
			signalDetectionRate: 0.6,
		});

		for (const run of factory.taskRuns) {
			const codes = suiteAndTaskCodeOf(seeded, run.taskId);
			const runEvents = factory.events.filter(
				(event) =>
					event.suiteCode === codes?.suiteCode &&
					event.taskCode === codes?.taskCode,
			);

			if (run.outcome === "NO") {
				expect(run.autoDetected).toBe(false);
				expect(runEvents).toHaveLength(0);
			} else {
				expect(run.autoDetected).toBe(true);
				expect(runEvents.length).toBeGreaterThan(0);
			}
		}
	});

	test("error_recovery só é respondida quando error_occurred foi Sim", async () => {
		const seeded = await seededProtocol();
		const errorOccurred = seeded.questions.find(
			(q) => q.key === "error_occurred",
		);
		const errorRecovery = seeded.questions.find(
			(q) => q.key === "error_recovery",
		);
		if (!errorOccurred || !errorRecovery)
			throw new Error("perguntas não encontradas");

		for (let i = 0; i < 15; i++) {
			const factory = buildFactorySession(seeded, {
				personaKey: "CITIZEN",
				status: "COMPLETED",
			});

			for (const run of factory.suiteRuns) {
				const occurredAnswer = factory.answers.find(
					(a) => a.suiteRunId === run.id && a.questionId === errorOccurred.id,
				);
				const recoveryAnswer = factory.answers.find(
					(a) => a.suiteRunId === run.id && a.questionId === errorRecovery.id,
				);

				if (occurredAnswer?.valueText === "YES") {
					expect(recoveryAnswer).toBeDefined();
				} else {
					expect(recoveryAnswer).toBeUndefined();
				}
			}
		}
	});

	test("sessão ABANDONED não fecha a última suíte nem gera respostas dela", async () => {
		const seeded = await seededProtocol();
		const factory = buildFactorySession(seeded, {
			personaKey: "CITIZEN",
			status: "ABANDONED",
		});

		const lastSuiteRun = factory.suiteRuns.at(-1);
		if (!lastSuiteRun) throw new Error("esperava ao menos uma suite_run");

		expect(lastSuiteRun.finishedAt).toBeUndefined();
		expect(factory.answers.some((a) => a.suiteRunId === lastSuiteRun.id)).toBe(
			false,
		);
		expect(factory.session.abandonReason).toBeDefined();
		expect(factory.session.finishedAt).toBeUndefined();
	});

	test("comentário livre nunca aparece fora de sessões COMPLETED", async () => {
		const seeded = await seededProtocol();

		for (let i = 0; i < 10; i++) {
			const factory = buildFactorySession(seeded, {
				personaKey: "CITIZEN",
				status: "ABANDONED",
			});
			expect(factory.answers.some((a) => a.suiteRunId === undefined)).toBe(
				false,
			);
		}
	});

	test("inserir um lote de sessões variadas não quebra nenhuma FK", async () => {
		const db = getDb();
		const seeded = await seededProtocol();

		for (let i = 0; i < 12; i++) {
			const factory = buildFactorySession(seeded);
			await insertFactorySession(db, factory);
		}

		expect(await rowCount(db, events)).toBeGreaterThan(0);
		expect(await rowCount(db, answers)).toBeGreaterThan(0);
	});
});
