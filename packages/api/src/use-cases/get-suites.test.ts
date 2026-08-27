import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import type { UsabilityCheckpointInput } from "../routers/usability-schemas";
import { getSuites, type SuiteMetrics } from "./get-suites";
import { sendUsabilityCheckpoint } from "./send-usability-checkpoint";
import { upsertUsabilitySession } from "./upsert-usability-session";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
} from "./usability-test-helpers";

function byCode(items: SuiteMetrics[]): Map<string, SuiteMetrics> {
	return new Map(items.map((suite) => [suite.code, suite]));
}

const RANGE = {
	from: Date.parse("2026-08-15T00:00:00.000Z"),
	to: Date.parse("2026-08-16T00:00:00.000Z"),
};

function finishedSuiteCheckpoint(sessionId: string): UsabilityCheckpointInput {
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
		],
		events: [],
		answers: [{ question_key: "satisfaction", value_number: 4 }],
	};
}

function inProgressSuiteCheckpoint(
	sessionId: string,
): UsabilityCheckpointInput {
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
		tasks: [],
		events: [],
		answers: [],
	};
}

describe("getSuites — exclusão de execuções em andamento (T07)", () => {
	test("execução sem finished_at não entra em execucoes nem em tempoMedioMs", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const finishedSession = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, finishedSession);
			await sendUsabilityCheckpoint(
				repositories,
				finishedSuiteCheckpoint(finishedSession.session_id),
			);

			const inProgressSession = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, inProgressSession);
			await sendUsabilityCheckpoint(
				repositories,
				inProgressSuiteCheckpoint(inProgressSession.session_id),
			);

			const suites = await getSuites(repositories, RANGE);
			const s1 = suites.find((suite) => suite.code === "S1");
			if (!s1) throw new Error("esperava linha S1");

			expect(s1.execucoes).toBe(1);
			expect(s1.tempoMedioMs).toBe(120_000);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("métricas com execuções fechadas ficam idênticas depois de uma execução em andamento entrar", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const sessionA = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, sessionA);
			await sendUsabilityCheckpoint(
				repositories,
				finishedSuiteCheckpoint(sessionA.session_id),
			);

			const sessionB = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, sessionB);
			await sendUsabilityCheckpoint(
				repositories,
				finishedSuiteCheckpoint(sessionB.session_id),
			);

			const antes = await getSuites(repositories, RANGE);

			const sessionC = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, sessionC);
			await sendUsabilityCheckpoint(
				repositories,
				inProgressSuiteCheckpoint(sessionC.session_id),
			);

			const depois = await getSuites(repositories, RANGE);

			expect(byCode(depois)).toEqual(byCode(antes));
		} finally {
			await ephemeral.destroy();
		}
	});
});
