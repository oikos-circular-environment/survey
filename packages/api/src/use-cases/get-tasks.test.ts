import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import type { UsabilityCheckpointInput } from "../routers/usability-schemas";
import { getTasks, type TaskMetrics } from "./get-tasks";
import { sendUsabilityCheckpoint } from "./send-usability-checkpoint";
import { upsertUsabilitySession } from "./upsert-usability-session";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
} from "./usability-test-helpers";

function byCode(items: TaskMetrics[]): Map<string, TaskMetrics> {
	return new Map(items.map((task) => [`${task.suiteCode}:${task.code}`, task]));
}

const RANGE = {
	from: Date.parse("2026-08-15T00:00:00.000Z"),
	to: Date.parse("2026-08-16T00:00:00.000Z"),
};

function finishedTasksCheckpoint(sessionId: string): UsabilityCheckpointInput {
	return {
		session_id: sessionId,
		suite_run_id: randomUUID(),
		chunk: { index: 0, total: 1 },
		suite: {
			code: "S1",
			position: 0,
			started_at: new Date("2026-08-15T18:00:00.000Z"),
			finished_at: new Date("2026-08-15T18:05:00.000Z"),
			active_ms: 120_000,
			wall_ms: 300_000,
			outcome: "YES",
		},
		tasks: [
			{
				code: "T8",
				position: 0,
				started_at: new Date("2026-08-15T18:00:00.000Z"),
				finished_at: new Date("2026-08-15T18:01:00.000Z"),
				active_ms: 30_000,
				outcome: "YES",
				auto_detected: true,
			},
			{
				code: "T13",
				position: 1,
				started_at: new Date("2026-08-15T18:01:00.000Z"),
				finished_at: new Date("2026-08-15T18:02:00.000Z"),
				active_ms: 25_000,
				outcome: "NO",
				auto_detected: false,
			},
		],
		events: [],
		answers: [],
	};
}

function inProgressTaskCheckpoint(sessionId: string): UsabilityCheckpointInput {
	return {
		session_id: sessionId,
		suite_run_id: randomUUID(),
		chunk: { index: 0, total: 1 },
		suite: {
			code: "S1",
			position: 0,
			started_at: new Date("2026-08-15T18:10:00.000Z"),
			active_ms: 8_000,
			wall_ms: 15_000,
		},
		tasks: [
			{
				code: "T16",
				position: 0,
				started_at: new Date("2026-08-15T18:10:00.000Z"),
				active_ms: 3_000,
				auto_detected: true,
			},
		],
		events: [],
		answers: [],
	};
}

describe("getTasks — exclusão de execuções em andamento (T07)", () => {
	test("tarefa sem finished_at não entra em tentativas nem eficiencia", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const finishedSession = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, finishedSession);
			await sendUsabilityCheckpoint(
				repositories,
				finishedTasksCheckpoint(finishedSession.session_id),
			);

			const inProgressSession = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, inProgressSession);
			await sendUsabilityCheckpoint(
				repositories,
				inProgressTaskCheckpoint(inProgressSession.session_id),
			);

			const { items } = await getTasks(repositories, {
				range: RANGE,
				page: 1,
				pageSize: 100,
			});
			const t8 = items.find((task) => task.code === "T8");
			const t16 = items.find((task) => task.code === "T16");
			if (!t8 || !t16) throw new Error("esperava linhas T8 e T16");

			expect(t8.tentativas).toBe(1);
			expect(t16.tentativas).toBe(0);
			expect(t16.eficiencia).toBe(0);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("métricas com todas as execuções fechadas ficam idênticas às de antes da mudança", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const finishedSession = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, finishedSession);
			await sendUsabilityCheckpoint(
				repositories,
				finishedTasksCheckpoint(finishedSession.session_id),
			);

			const antes = await getTasks(repositories, {
				range: RANGE,
				page: 1,
				pageSize: 100,
			});

			const inProgressSession = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, inProgressSession);
			await sendUsabilityCheckpoint(
				repositories,
				inProgressTaskCheckpoint(inProgressSession.session_id),
			);

			const depois = await getTasks(repositories, {
				range: RANGE,
				page: 1,
				pageSize: 100,
			});

			expect(Object.fromEntries(byCode(depois.items))).toEqual(
				Object.fromEntries(byCode(antes.items)),
			);
		} finally {
			await ephemeral.destroy();
		}
	});
});
