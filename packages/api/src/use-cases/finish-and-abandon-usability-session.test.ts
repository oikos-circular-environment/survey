import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { answers } from "@oikos-circular-environment/survey-db/schema/index";
import { and, eq, isNull } from "drizzle-orm";

import { abandonUsabilitySession } from "./abandon-usability-session";
import { finishUsabilitySession } from "./finish-usability-session";
import { upsertUsabilitySession } from "./upsert-usability-session";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
} from "./usability-test-helpers";

describe("finishUsabilitySession", () => {
	test("concluir duas vezes devolve o mesmo código e não duplica respostas finais", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			const finishInput = {
				session_id: session.session_id,
				answers: [
					{ question_key: "free_comment", value_text: "Gostei muito." },
				],
				active_ms: 1_840_000,
				wall_ms: 2_600_000,
				finished_at: new Date("2026-08-18T09:12:44.000Z"),
			};

			const first = await finishUsabilitySession(repositories, finishInput);
			const second = await finishUsabilitySession(repositories, finishInput);

			expect(second.participant_code).toBe(first.participant_code);
			expect(second.status).toBe("COMPLETED");

			const finalAnswerCount = await ephemeral.db
				.select()
				.from(answers)
				.where(
					and(
						eq(answers.sessionId, session.session_id),
						isNull(answers.suiteRunId),
					),
				);
			expect(finalAnswerCount).toHaveLength(1);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("grava os totais de tempo exatamente como o aparelho enviou", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			await finishUsabilitySession(repositories, {
				session_id: session.session_id,
				answers: [],
				active_ms: 555_000,
				wall_ms: 999_000,
				finished_at: new Date("2026-08-18T09:12:44.000Z"),
			});

			const detail = await repositories.sessions.findDetailById(
				session.session_id,
			);
			expect(detail?.activeMs).toBe(555_000);
			expect(detail?.wallMs).toBe(999_000);
			expect(detail?.status).toBe("COMPLETED");
		} finally {
			await ephemeral.destroy();
		}
	});

	test("sessão inexistente devolve NOT_FOUND", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			await expect(
				finishUsabilitySession(repositories, {
					session_id: randomUUID(),
					answers: [],
					active_ms: 0,
					wall_ms: 0,
					finished_at: new Date(),
				}),
			).rejects.toMatchObject({ code: "NOT_FOUND" });
		} finally {
			await ephemeral.destroy();
		}
	});
});

describe("abandonUsabilitySession", () => {
	test("desistir grava o motivo e marca ABANDONED", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			const result = await abandonUsabilitySession(repositories, {
				session_id: session.session_id,
				reason: "Não consegui achar onde cadastrar o resíduo.",
				current_suite_code: "S3",
				active_ms: 420_000,
				wall_ms: 610_000,
				finished_at: new Date("2026-08-15T18:02:10.000Z"),
			});

			expect(result.status).toBe("ABANDONED");

			const detail = await repositories.sessions.findDetailById(
				session.session_id,
			);
			expect(detail?.status).toBe("ABANDONED");
			expect(detail?.abandonReason).toBe(
				"Não consegui achar onde cadastrar o resíduo.",
			);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("desistir é idempotente", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			const abandonInput = {
				session_id: session.session_id,
				active_ms: 100,
				wall_ms: 200,
				finished_at: new Date("2026-08-15T18:02:10.000Z"),
			};

			const first = await abandonUsabilitySession(repositories, abandonInput);
			const second = await abandonUsabilitySession(repositories, abandonInput);
			expect(second.participant_code).toBe(first.participant_code);
			expect(second.status).toBe("ABANDONED");
		} finally {
			await ephemeral.destroy();
		}
	});

	test("desistir de uma sessão já concluída é recusado, com erro que diz o porquê", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await finishUsabilitySession(repositories, {
				session_id: session.session_id,
				answers: [],
				active_ms: 100,
				wall_ms: 200,
				finished_at: new Date(),
			});

			const attempt = abandonUsabilitySession(repositories, {
				session_id: session.session_id,
				active_ms: 100,
				wall_ms: 200,
				finished_at: new Date(),
			});

			await expect(attempt).rejects.toMatchObject({ code: "CONFLICT" });
			await expect(attempt).rejects.toThrow(/já concluída/);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("sessão inexistente devolve NOT_FOUND", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			await expect(
				abandonUsabilitySession(repositories, {
					session_id: randomUUID(),
					active_ms: 0,
					wall_ms: 0,
					finished_at: new Date(),
				}),
			).rejects.toMatchObject({ code: "NOT_FOUND" });
		} finally {
			await ephemeral.destroy();
		}
	});
});

describe("cadeia de reinício (superseded_by)", () => {
	test("após o reinício, as duas sessões existem, a antiga está fechada e a cadeia é navegável", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const oldSession = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, oldSession);

			// o gatilho do reinício não é uma destas cinco procedures (fora do escopo
			// deste PR, ver 02-tech-plan.md) — aqui só se prova que schema/repositório
			// sustentam a cadeia: a sessão antiga é encerrada (abandon) e apontada para a
			// nova via `setSupersededBy`.
			await abandonUsabilitySession(repositories, {
				session_id: oldSession.session_id,
				reason: "Reinício solicitado pelo participante.",
				active_ms: 10_000,
				wall_ms: 20_000,
				finished_at: new Date(),
			});

			const newSession = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, newSession);

			await repositories.sessions.setSupersededBy(
				oldSession.session_id,
				newSession.session_id,
			);

			const oldState = await repositories.sessions.findStateById(
				oldSession.session_id,
			);
			const newState = await repositories.sessions.findStateById(
				newSession.session_id,
			);

			expect(oldState?.status).toBe("ABANDONED");
			expect(oldState?.supersededBy).toBe(newSession.session_id);
			expect(newState).toBeDefined();
			expect(newState?.status).toBe("IN_PROGRESS");
		} finally {
			await ephemeral.destroy();
		}
	});
});
