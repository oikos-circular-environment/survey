import { describe, expect, test } from "bun:test";
import {
	deletedTesters,
	sessions,
} from "@oikos-circular-environment/survey-db/schema/index";
import { eq } from "drizzle-orm";

import {
	deleteUsabilitySessionData,
	SELF_SERVICE_DELETED_BY,
} from "./delete-usability-session-data";
import { upsertUsabilitySession } from "./upsert-usability-session";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
} from "./usability-test-helpers";

describe("deleteUsabilitySessionData", () => {
	test("apaga a sessão e grava snapshot de auditoria como self-service", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);

			const result = await deleteUsabilitySessionData(repositories, {
				session_id: session.session_id,
			});

			expect(result.deleted).toBe(true);
			expect(result.participant_code).toBeTruthy();

			const remaining = await ephemeral.db
				.select()
				.from(sessions)
				.where(eq(sessions.id, session.session_id));
			expect(remaining).toHaveLength(0);

			const [audit] = await ephemeral.db
				.select()
				.from(deletedTesters)
				.where(eq(deletedTesters.sessionId, session.session_id));
			expect(audit?.deletedByUserId).toBe(SELF_SERVICE_DELETED_BY);
			expect(audit?.participantCode).toBe(result.participant_code);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("sessão inexistente falha com NOT_FOUND", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			await expect(
				deleteUsabilitySessionData(repositories, { session_id: "não-existe" }),
			).rejects.toMatchObject({ code: "NOT_FOUND" });
		} finally {
			await ephemeral.destroy();
		}
	});
});
