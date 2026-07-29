import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	answers,
	events,
	suiteRuns,
	taskRuns,
} from "@oikos-circular-environment/survey-db/schema/index";
import { rowCount } from "@oikos-circular-environment/survey-db/testing/queries";

import type { UsabilityCheckpointInput } from "../routers/usability-schemas";
import { sendUsabilityCheckpoint } from "./send-usability-checkpoint";
import { upsertUsabilitySession } from "./upsert-usability-session";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
} from "./usability-test-helpers";

function buildCheckpointInput(
	sessionId: string,
	overrides: Partial<UsabilityCheckpointInput> = {},
): UsabilityCheckpointInput {
	return {
		session_id: sessionId,
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
				code: "T9",
				position: 1,
				started_at: new Date("2026-08-15T18:01:00.000Z"),
				finished_at: new Date("2026-08-15T18:02:00.000Z"),
				active_ms: 25_000,
				outcome: "NO",
				auto_detected: false,
			},
		],
		events: [
			{
				client_event_id: randomUUID(),
				seq: 0,
				type: "api.call",
				suite_code: "S1",
				task_code: "T8",
				occurred_at: new Date("2026-08-15T18:00:30.000Z"),
				payload: { method: "GET", path_pattern: "/v1/market", status: 200 },
			},
		],
		answers: [
			{ question_key: "satisfaction", value_number: 4 },
			{ question_key: "error_occurred", value_text: "NO" },
		],
		...overrides,
	};
}

describe("sendUsabilityCheckpoint", () => {
	test("enviar o mesmo checkpoint três vezes deixa exatamente uma execução de suíte e as contagens não mudam", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			const input = buildCheckpointInput(session.session_id);

			await sendUsabilityCheckpoint(repositories, input);
			const afterFirst = {
				suiteRuns: await rowCount(ephemeral.db, suiteRuns),
				taskRuns: await rowCount(ephemeral.db, taskRuns),
				answers: await rowCount(ephemeral.db, answers),
			};

			await sendUsabilityCheckpoint(repositories, input);
			await sendUsabilityCheckpoint(repositories, input);
			const afterThird = {
				suiteRuns: await rowCount(ephemeral.db, suiteRuns),
				taskRuns: await rowCount(ephemeral.db, taskRuns),
				answers: await rowCount(ephemeral.db, answers),
			};

			expect(afterFirst.suiteRuns).toBe(1);
			expect(afterFirst.taskRuns).toBe(2);
			expect(afterFirst.answers).toBe(2);
			expect(afterThird).toEqual(afterFirst);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("dois envios com eventos diferentes da mesma etapa somam os eventos sem duplicar os comuns", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			const sharedEvent = {
				client_event_id: randomUUID(),
				seq: 0,
				type: "api.call" as const,
				suite_code: "S1",
				task_code: "T8",
				occurred_at: new Date("2026-08-15T18:00:30.000Z"),
				payload: { method: "GET", path_pattern: "/v1/market", status: 200 },
			};
			const secondEvent = {
				client_event_id: randomUUID(),
				seq: 1,
				type: "screen.enter" as const,
				suite_code: "S1",
				task_code: "T9",
				occurred_at: new Date("2026-08-15T18:01:30.000Z"),
				payload: { route: "/market" },
			};

			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, { events: [sharedEvent] }),
			);
			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					events: [sharedEvent, secondEvent],
				}),
			);

			const totalEvents = await rowCount(ephemeral.db, events);
			expect(totalEvents).toBe(2);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("checkpoint para sessão inexistente devolve NOT_FOUND sem criar nada", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const input = buildCheckpointInput(randomUUID());

			await expect(
				sendUsabilityCheckpoint(repositories, input),
			).rejects.toMatchObject({ code: "NOT_FOUND" });

			expect(await rowCount(ephemeral.db, suiteRuns)).toBe(0);
			expect(await rowCount(ephemeral.db, events)).toBe(0);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("outcome e auto_detected são gravados em colunas independentes, sem um sobrescrever o outro", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			// combinação que não existiria sob autodeclaração (outcome NO com sinal detectado)
			// — prova que os dois campos não derivam um do outro.
			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					tasks: [
						{
							code: "T8",
							position: 0,
							started_at: new Date("2026-08-15T18:00:00.000Z"),
							active_ms: 10_000,
							outcome: "NO",
							auto_detected: true,
						},
						{
							code: "T9",
							position: 1,
							started_at: new Date("2026-08-15T18:01:00.000Z"),
							active_ms: 10_000,
							outcome: "YES",
							auto_detected: false,
						},
					],
				}),
			);

			const rows = await ephemeral.db
				.select({
					position: taskRuns.position,
					outcome: taskRuns.outcome,
					autoDetected: taskRuns.autoDetected,
				})
				.from(taskRuns)
				.orderBy(taskRuns.position);

			const first = rows.find((row) => row.position === 0);
			const second = rows.find((row) => row.position === 1);
			expect(first?.outcome).toBe("NO");
			expect(first?.autoDetected).toBe(true);
			expect(second?.outcome).toBe("YES");
			expect(second?.autoDetected).toBe(false);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("suíte, tarefa ou pergunta desconhecidas no protocolo são recusadas com BAD_REQUEST", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			await expect(
				sendUsabilityCheckpoint(
					repositories,
					buildCheckpointInput(session.session_id, {
						suite: {
							...buildCheckpointInput(session.session_id).suite,
							code: "S999",
						},
					}),
				),
			).rejects.toMatchObject({ code: "BAD_REQUEST" });
		} finally {
			await ephemeral.destroy();
		}
	});
});
