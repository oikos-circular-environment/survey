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

function suiteOneCheckpoint(sessionId: string): UsabilityCheckpointInput {
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

function suiteTwoCheckpoint(sessionId: string): UsabilityCheckpointInput {
	return {
		session_id: sessionId,
		suite_run_id: randomUUID(),
		chunk: { index: 0, total: 1 },
		suite: {
			code: "S2",
			position: 1,
			started_at: new Date("2026-08-15T18:05:00.000Z"),
			finished_at: new Date("2026-08-15T18:09:00.000Z"),
			active_ms: 90_000,
			wall_ms: 240_000,
			outcome: "PARTIAL",
		},
		tasks: [],
		events: [],
		answers: [{ question_key: "satisfaction", value_number: 2 }],
	};
}

function suiteInProgressCheckpoint(
	sessionId: string,
): UsabilityCheckpointInput {
	return {
		session_id: sessionId,
		suite_run_id: randomUUID(),
		chunk: { index: 0, total: 1 },
		suite: {
			code: "S6",
			position: 5,
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
	test("execução sem finished_at não entra em execucoes, tempoMedioMs nem eficiencia", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await sendUsabilityCheckpoint(
				repositories,
				suiteOneCheckpoint(session.session_id),
			);
			await sendUsabilityCheckpoint(
				repositories,
				suiteInProgressCheckpoint(session.session_id),
			);

			const suites = await getSuites(repositories, RANGE);
			const s1 = suites.find((suite) => suite.code === "S1");
			const s6 = suites.find((suite) => suite.code === "S6");
			if (!s1 || !s6) throw new Error("esperava linhas S1 e S6");

			expect(s1.execucoes).toBe(1);
			expect(s1.tempoMedioMs).toBe(120_000);
			expect(s6.execucoes).toBe(0);
			expect(s6.tempoMedioMs).toBe(0);
			expect(s6.eficiencia).toBe(0);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("métricas com todas as execuções fechadas ficam idênticas às de antes da mudança", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await sendUsabilityCheckpoint(
				repositories,
				suiteOneCheckpoint(session.session_id),
			);
			await sendUsabilityCheckpoint(
				repositories,
				suiteTwoCheckpoint(session.session_id),
			);

			const antes = await getSuites(repositories, RANGE);

			await sendUsabilityCheckpoint(
				repositories,
				suiteInProgressCheckpoint(session.session_id),
			);

			const depois = await getSuites(repositories, RANGE);

			expect(byCode(depois)).toEqual(byCode(antes));
		} finally {
			await ephemeral.destroy();
		}
	});
});
