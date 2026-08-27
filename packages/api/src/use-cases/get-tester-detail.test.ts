import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { protocol } from "@oikos-circular-environment/survey-db/protocol/data";
import { seedProtocol } from "@oikos-circular-environment/survey-db/seed/seed";

import type { UsabilityCheckpointInput } from "../routers/usability-schemas";
import { getTesterDetail } from "./get-tester-detail";
import { sendUsabilityCheckpoint } from "./send-usability-checkpoint";
import { upsertUsabilitySession } from "./upsert-usability-session";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
} from "./usability-test-helpers";

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
		answers: [
			{ question_key: "satisfaction", value_number: 4 },
			{ question_key: "error_occurred", value_text: "NO" },
		],
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

describe("getTesterDetail", () => {
	test("a suíte carrega suas tarefas e as respostas pós-etapa", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await sendUsabilityCheckpoint(
				repositories,
				suiteOneCheckpoint(session.session_id),
			);

			const detail = await getTesterDetail(repositories, session.session_id);
			if (!detail) throw new Error("sessão deveria existir");

			expect(detail.suiteRuns.length).toBe(1);

			const s1 = detail.suiteRuns.find((run) => run.suiteCode === "S1");
			expect(s1?.tasks.map((task) => task.taskCode)).toEqual(["T8", "T13"]);
			expect(s1?.tasks[0]?.autoDetected).toBe(true);
			expect(s1?.tasks[1]?.autoDetected).toBe(false);
			expect(s1?.tasks[1]?.outcome).toBe("NO");

			const satisfaction = s1?.answers.find(
				(answer) => answer.questionKey === "satisfaction",
			);
			expect(satisfaction?.value).toBe(4);
			expect(satisfaction?.valueLabel).toBe("Bom");
		} finally {
			await ephemeral.destroy();
		}
	});

	test("respostas de fim de sessão não vazam para dentro de nenhuma suíte", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await sendUsabilityCheckpoint(
				repositories,
				suiteOneCheckpoint(session.session_id),
			);

			const detail = await getTesterDetail(repositories, session.session_id);
			const [run] = detail?.suiteRuns ?? [];

			expect(
				run?.answers.every((answer) => answer.questionKey !== "free_comment"),
			).toBe(true);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("resolve as suítes pela versão que a sessão executou, não pela vigente", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await sendUsabilityCheckpoint(
				repositories,
				suiteOneCheckpoint(session.session_id),
			);

			// Publica uma versão mais nova depois da sessão: as definições dela têm ids
			// próprios, então resolver pela vigente não acharia a suíte executada e o
			// código cairia no UUID cru.
			await seedProtocol(ephemeral.db, {
				...protocol,
				version: protocol.version + 1,
			});

			const detail = await getTesterDetail(repositories, session.session_id);
			const [run] = detail?.suiteRuns ?? [];

			expect(run?.suiteCode).toBe("S1");
			expect(run?.suiteTitle.length).toBeGreaterThan(0);
			expect(run?.tasks.map((task) => task.taskCode)).toEqual(["T8", "T13"]);
			expect(detail?.ageRange).toBe("25 a 34 anos");
		} finally {
			await ephemeral.destroy();
		}
	});

	test("sessão sem nenhum checkpoint devolve execução vazia, não erro", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			const detail = await getTesterDetail(repositories, session.session_id);

			expect(detail?.suiteRuns).toEqual([]);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("execução em andamento aparece no detalhe do testador (findBySessionId não filtra)", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await sendUsabilityCheckpoint(
				repositories,
				suiteInProgressCheckpoint(session.session_id),
			);

			const detail = await getTesterDetail(repositories, session.session_id);
			const [run] = detail?.suiteRuns ?? [];

			expect(detail?.suiteRuns.length).toBe(1);
			expect(run?.suiteCode).toBe("S1");
			expect(run?.outcome).toBeNull();
			expect(run?.finishedAt).toBeNull();
			expect(run?.tasks[0]?.taskCode).toBe("T16");
			expect(run?.tasks[0]?.finishedAt).toBeNull();
		} finally {
			await ephemeral.destroy();
		}
	});
});
