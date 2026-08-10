import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	usabilityAbandonInput,
	usabilityCheckpointInput,
	usabilityFinishInput,
	usabilitySessionUpsertInput,
} from "./usability-schemas";

function validSessionUpsert() {
	return {
		session_id: randomUUID(),
		protocol_key: "oikos-walkthrough",
		protocol_version: 1,
		persona: "CITIZEN",
		screener: {
			state_uf: "SP",
			city_name: "São Paulo",
			age_range: "AGE_25_34",
			education_level: "HIGHER_COMPLETE",
			chain_role: "NONE",
			waste_contact_frequency: 3,
			app_experience: 4,
		},
		consent: {
			version: "2026-08-01",
			accepted_at: new Date("2026-08-15T17:32:10.000Z"),
		},
		device: {
			os: "android",
			os_version: "14",
			app_version: "1.0.1",
			screen_size: "SMALL",
		},
		started_at: new Date("2026-08-15T17:33:02.000Z"),
	};
}

function validCheckpoint() {
	return {
		session_id: randomUUID(),
		suite_run_id: randomUUID(),
		chunk: { index: 0, total: 1 },
		suite: {
			code: "S1",
			position: 0,
			started_at: new Date(),
			active_ms: 0,
			wall_ms: 0,
		},
		tasks: [],
		events: [],
		answers: [],
	};
}

function validFinish() {
	return {
		session_id: randomUUID(),
		answers: [],
		active_ms: 0,
		wall_ms: 0,
		finished_at: new Date(),
	};
}

function validAbandon() {
	return {
		session_id: randomUUID(),
		active_ms: 0,
		wall_ms: 0,
		finished_at: new Date(),
	};
}

describe("usability-schemas", () => {
	describe("session.upsert", () => {
		test("payload válido passa", () => {
			expect(
				usabilitySessionUpsertInput.safeParse(validSessionUpsert()).success,
			).toBe(true);
		});

		test("chave desconhecida é rejeitada", () => {
			const input = { ...validSessionUpsert(), extra: true };
			expect(usabilitySessionUpsertInput.safeParse(input).success).toBe(false);
		});

		test("chave desconhecida em objeto aninhado é rejeitada", () => {
			const input = {
				...validSessionUpsert(),
				screener: { ...validSessionUpsert().screener, extra: true },
			};
			expect(usabilitySessionUpsertInput.safeParse(input).success).toBe(false);
		});
	});

	describe("checkpoint.send", () => {
		test("payload válido passa", () => {
			expect(
				usabilityCheckpointInput.safeParse(validCheckpoint()).success,
			).toBe(true);
		});

		test("suite_run_id ausente é rejeitado", () => {
			const { suite_run_id: _, ...input } = validCheckpoint();
			expect(usabilityCheckpointInput.safeParse(input).success).toBe(false);
		});

		test("suite_run_id inválido é rejeitado", () => {
			const input = { ...validCheckpoint(), suite_run_id: "not-a-uuid" };
			expect(usabilityCheckpointInput.safeParse(input).success).toBe(false);
		});

		test("chave desconhecida é rejeitada", () => {
			const input = { ...validCheckpoint(), extra: true };
			expect(usabilityCheckpointInput.safeParse(input).success).toBe(false);
		});

		test("tasks ausente é rejeitado", () => {
			const { tasks: _, ...input } = validCheckpoint();
			expect(usabilityCheckpointInput.safeParse(input).success).toBe(false);
		});

		test("events ausente é rejeitado", () => {
			const { events: _, ...input } = validCheckpoint();
			expect(usabilityCheckpointInput.safeParse(input).success).toBe(false);
		});

		test("answers ausente é rejeitado", () => {
			const { answers: _, ...input } = validCheckpoint();
			expect(usabilityCheckpointInput.safeParse(input).success).toBe(false);
		});

		test("events acima do teto é rejeitado", () => {
			const events = Array.from({ length: 2001 }, (_, seq) => ({
				client_event_id: randomUUID(),
				seq,
				type: "screen.enter",
				occurred_at: new Date(),
				payload: {},
			}));
			const input = { ...validCheckpoint(), events };
			expect(usabilityCheckpointInput.safeParse(input).success).toBe(false);
		});

		test("events no teto é aceito", () => {
			const events = Array.from({ length: 2000 }, (_, seq) => ({
				client_event_id: randomUUID(),
				seq,
				type: "screen.enter",
				occurred_at: new Date(),
				payload: {},
			}));
			const input = { ...validCheckpoint(), events };
			expect(usabilityCheckpointInput.safeParse(input).success).toBe(true);
		});
	});

	describe("finish", () => {
		test("payload válido passa", () => {
			expect(usabilityFinishInput.safeParse(validFinish()).success).toBe(true);
		});

		test("chave desconhecida é rejeitada", () => {
			const input = { ...validFinish(), extra: true };
			expect(usabilityFinishInput.safeParse(input).success).toBe(false);
		});
	});

	describe("abandon", () => {
		test("payload válido passa", () => {
			expect(usabilityAbandonInput.safeParse(validAbandon()).success).toBe(
				true,
			);
		});

		test("chave desconhecida é rejeitada", () => {
			const input = { ...validAbandon(), extra: true };
			expect(usabilityAbandonInput.safeParse(input).success).toBe(false);
		});
	});
});
