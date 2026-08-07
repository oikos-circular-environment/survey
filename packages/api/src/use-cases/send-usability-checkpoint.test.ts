import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	answers,
	events,
	questions,
	suiteRuns,
	taskRuns,
} from "@oikos-circular-environment/survey-db/schema/index";
import { rowCount } from "@oikos-circular-environment/survey-db/testing/queries";
import { eq } from "drizzle-orm";

import type { UsabilityCheckpointInput } from "../routers/usability-schemas";
import { sendUsabilityCheckpoint } from "./send-usability-checkpoint";
import { upsertUsabilitySession } from "./upsert-usability-session";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
} from "./usability-test-helpers";

const T8_TASK = {
	code: "T8",
	position: 0,
	started_at: new Date("2026-08-15T18:00:00.000Z"),
	finished_at: new Date("2026-08-15T18:01:00.000Z"),
	active_ms: 30_000,
	outcome: "YES",
	auto_detected: true,
} as const;

const T9_TASK = {
	code: "T9",
	position: 1,
	started_at: new Date("2026-08-15T18:01:00.000Z"),
	finished_at: new Date("2026-08-15T18:02:00.000Z"),
	active_ms: 25_000,
	outcome: "NO",
	auto_detected: false,
} as const;

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
		tasks: [{ ...T8_TASK }, { ...T9_TASK }],
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

async function taskRowsOf(
	ephemeral: Awaited<ReturnType<typeof setupUsabilityTest>>["ephemeral"],
) {
	return ephemeral.db
		.select({
			position: taskRuns.position,
			startedAt: taskRuns.startedAt,
			outcome: taskRuns.outcome,
			autoDetected: taskRuns.autoDetected,
			activeMs: taskRuns.activeMs,
		})
		.from(taskRuns)
		.orderBy(taskRuns.position);
}

describe("sendUsabilityCheckpoint", () => {
	test("reenviar o mesmo checkpoint converge para uma única execução, sem substituição destrutiva", async () => {
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

	test("envio parcial acumula: fatia seguinte com tarefa nova mantém a anterior com os campos do primeiro envio", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			const suite = {
				code: "S1",
				position: 0,
				started_at: new Date("2026-08-15T18:00:00.000Z"),
				finished_at: new Date("2026-08-15T18:05:00.000Z"),
				active_ms: 60_000,
				wall_ms: 300_000,
				outcome: "YES",
			} as const;

			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					suite,
					tasks: [{ ...T8_TASK }],
					events: [],
					answers: [],
				}),
			);

			// reenvio com T8 mais adiantada e sem sinal detectado: não pode regredir o primeiro
			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					suite: { ...suite, active_ms: 90_000 },
					tasks: [
						{
							...T8_TASK,
							started_at: new Date("2026-08-15T18:00:30.000Z"),
							auto_detected: false,
						},
						{ ...T9_TASK },
					],
					events: [],
					answers: [],
				}),
			);

			const rows = await taskRowsOf(ephemeral);
			expect(rows).toHaveLength(2);
			expect(rows[0]?.startedAt).toEqual(new Date("2026-08-15T18:00:00.000Z"));
			expect(rows[0]?.autoDetected).toBe(true);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("envio sem desfecho não regride finished_at nem outcome já gravados", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			const closed = buildCheckpointInput(session.session_id, {
				events: [],
				answers: [],
			});
			await sendUsabilityCheckpoint(repositories, closed);

			// envio parcial no meio da execução: o payload não carrega finished_at/outcome
			const midRun = buildCheckpointInput(session.session_id, {
				suite: {
					code: "S1",
					position: 0,
					started_at: new Date("2026-08-15T18:00:00.000Z"),
					active_ms: 200_000,
					wall_ms: 600_000,
				},
				tasks: [{ ...T8_TASK }, { ...T9_TASK }],
				events: [],
				answers: [],
			});
			await sendUsabilityCheckpoint(repositories, midRun);

			const rows = await ephemeral.db
				.select({
					finishedAt: suiteRuns.finishedAt,
					outcome: suiteRuns.outcome,
				})
				.from(suiteRuns);
			expect(rows).toHaveLength(1);
			expect(rows[0]?.finishedAt).toEqual(new Date("2026-08-15T18:05:00.000Z"));
			expect(rows[0]?.outcome).toBe("YES");
		} finally {
			await ephemeral.destroy();
		}
	});

	test("envio sem respostas não apaga as respostas já gravadas", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, { events: [] }),
			);

			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					answers: [],
					events: [],
					tasks: [{ ...T8_TASK }, { ...T9_TASK }],
				}),
			);

			expect(await rowCount(ephemeral.db, answers)).toBe(2);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("campos monotônicos não regridem: reenvio antigo não desfaz o novo", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			const suite = {
				code: "S1",
				position: 0,
				started_at: new Date("2026-08-15T18:00:00.000Z"),
				finished_at: new Date("2026-08-15T18:05:00.000Z"),
				active_ms: 60_000,
				wall_ms: 300_000,
				outcome: "YES",
			} as const;

			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					suite,
					tasks: [{ ...T8_TASK }],
					events: [],
					answers: [],
				}),
			);

			// reenvio com valores menores que os gravados
			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					suite: { ...suite, active_ms: 10_000, wall_ms: 100_000 },
					tasks: [{ ...T8_TASK, active_ms: 5_000, auto_detected: false }],
					events: [],
					answers: [],
				}),
			);

			const [suiteRow] = await ephemeral.db
				.select({ activeMs: suiteRuns.activeMs, wallMs: suiteRuns.wallMs })
				.from(suiteRuns);
			expect(suiteRow?.activeMs).toBe(60_000);
			expect(suiteRow?.wallMs).toBe(300_000);

			const [taskRow] = await taskRowsOf(ephemeral);
			expect(taskRow?.activeMs).toBe(30_000);
			expect(taskRow?.autoDetected).toBe(true);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("atualização no lugar: mesmo valor de resposta e mesmo desfecho de tarefa são sobrescritos sem duplicar", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, { events: [] }),
			);
			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					answers: [
						{ question_key: "satisfaction", value_number: 2 },
						{ question_key: "error_occurred", value_text: "YES" },
					],
					tasks: [{ ...T8_TASK, outcome: "NO" }, { ...T9_TASK }],
					events: [],
				}),
			);

			expect(await rowCount(ephemeral.db, answers)).toBe(2);
			expect(await rowCount(ephemeral.db, taskRuns)).toBe(2);

			const satisfaction = await ephemeral.db
				.select({ valueNumber: answers.valueNumber })
				.from(answers)
				.innerJoin(questions, eq(answers.questionId, questions.id))
				.where(eq(questions.key, "satisfaction"));
			expect(satisfaction).toEqual([{ valueNumber: 2 }]);

			const t8 = (await taskRowsOf(ephemeral)).find(
				(row) => row.position === 0,
			);
			expect(t8?.outcome).toBe("NO");
		} finally {
			await ephemeral.destroy();
		}
	});

	test("envios fora de ordem preservam as duas execuções e o menor started_at vence", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			const s2 = buildCheckpointInput(session.session_id, {
				suite: {
					code: "S2",
					position: 1,
					started_at: new Date("2026-08-15T18:05:00.000Z"),
					finished_at: new Date("2026-08-15T18:10:00.000Z"),
					active_ms: 90_000,
					wall_ms: 300_000,
					outcome: "NO",
				},
				tasks: [
					{
						code: "T1",
						position: 0,
						started_at: new Date("2026-08-15T18:05:00.000Z"),
						finished_at: new Date("2026-08-15T18:06:00.000Z"),
						active_ms: 30_000,
						outcome: "YES",
						auto_detected: true,
					},
				],
				events: [],
				answers: [],
			});
			await sendUsabilityCheckpoint(repositories, s2);

			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					suite: {
						code: "S1",
						position: 0,
						started_at: new Date("2026-08-15T18:00:00.000Z"),
						finished_at: new Date("2026-08-15T18:05:00.000Z"),
						active_ms: 120_000,
						wall_ms: 300_000,
						outcome: "YES",
					},
					tasks: [{ ...T8_TASK }, { ...T9_TASK }],
					events: [],
					answers: [],
				}),
			);

			// reenvio da posição 0 com started_at mais tarde não regride o início
			await sendUsabilityCheckpoint(
				repositories,
				buildCheckpointInput(session.session_id, {
					suite: {
						code: "S1",
						position: 0,
						started_at: new Date("2026-08-15T18:10:00.000Z"),
						active_ms: 120_000,
						wall_ms: 300_000,
					},
					tasks: [{ ...T8_TASK }, { ...T9_TASK }],
					events: [],
					answers: [],
				}),
			);

			const runs = await ephemeral.db
				.select({
					position: suiteRuns.position,
					startedAt: suiteRuns.startedAt,
				})
				.from(suiteRuns)
				.orderBy(suiteRuns.position);
			expect(runs).toHaveLength(2);
			expect(runs[0]?.position).toBe(0);
			expect(runs[1]?.position).toBe(1);
			expect(runs[0]?.startedAt).toEqual(new Date("2026-08-15T18:00:00.000Z"));
		} finally {
			await ephemeral.destroy();
		}
	});

	test("envios concorrentes de tarefas disjuntas convergem para uma única execução", async () => {
		for (let round = 0; round < 5; round++) {
			const { ephemeral, repositories } = await setupUsabilityTest();
			try {
				const session = buildSessionUpsertInput();
				await upsertUsabilitySession(repositories, session);

				const sendT8 = buildCheckpointInput(session.session_id, {
					tasks: [{ ...T8_TASK }],
					events: [],
					answers: [],
				});
				const sendT9 = buildCheckpointInput(session.session_id, {
					tasks: [{ ...T9_TASK }],
					events: [],
					answers: [],
				});

				await Promise.all([
					sendUsabilityCheckpoint(repositories, sendT8),
					sendUsabilityCheckpoint(repositories, sendT9),
				]);

				expect(await rowCount(ephemeral.db, suiteRuns)).toBe(1);
				expect(await rowCount(ephemeral.db, taskRuns)).toBe(2);
			} finally {
				await ephemeral.destroy();
			}
		}
	}, 30_000);

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
							...T8_TASK,
							outcome: "NO",
						},
						{
							...T9_TASK,
							outcome: "YES",
							auto_detected: false,
						},
					],
				}),
			);

			const rows = await taskRowsOf(ephemeral);

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
