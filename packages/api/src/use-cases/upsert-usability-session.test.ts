import { describe, expect, test } from "bun:test";
import { protocol } from "@oikos-circular-environment/survey-db/protocol/data";
import { seedProtocol } from "@oikos-circular-environment/survey-db/seed/seed";

import { upsertUsabilitySession } from "./upsert-usability-session";
import {
	buildSessionUpsertInput,
	setupUsabilityTest,
} from "./usability-test-helpers";

describe("upsertUsabilitySession", () => {
	test("chamar duas vezes com o mesmo corpo produz o mesmo estado e o mesmo participant_code", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const input = buildSessionUpsertInput();
			const first = await upsertUsabilitySession(repositories, input);
			const second = await upsertUsabilitySession(repositories, input);

			expect(second.session_id).toBe(first.session_id);
			expect(second.participant_code).toBe(first.participant_code);
			expect(second.protocol_version).toBe(first.protocol_version);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("reenviar com uma versão de protocolo diferente não troca a versão já gravada", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const newerVersion = { ...protocol, version: protocol.version + 1 };
			await seedProtocol(ephemeral.db, newerVersion);

			const input = buildSessionUpsertInput();
			const first = await upsertUsabilitySession(repositories, input);
			expect(first.protocol_version).toBe(protocol.version);

			const second = await upsertUsabilitySession(repositories, {
				...input,
				protocol_version: newerVersion.version,
			});

			expect(second.protocol_version).toBe(protocol.version);
			expect(second.participant_code).toBe(first.participant_code);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("duas sessões criadas simultaneamente recebem participant_code distintos", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const [a, b] = await Promise.all([
				upsertUsabilitySession(repositories, buildSessionUpsertInput()),
				upsertUsabilitySession(repositories, buildSessionUpsertInput()),
			]);

			expect(a.participant_code).not.toBe(b.participant_code);
			expect(a.participant_code).toHaveLength(26);
			expect(b.participant_code).toHaveLength(26);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("protocolo/versão desconhecidos são recusados com BAD_REQUEST, sem gravar nada", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const input = buildSessionUpsertInput({ protocol_version: 999 });

			await expect(
				upsertUsabilitySession(repositories, input),
			).rejects.toMatchObject({ code: "BAD_REQUEST" });

			const state = await repositories.sessions.findStateById(input.session_id);
			expect(state).toBeUndefined();
		} finally {
			await ephemeral.destroy();
		}
	});
});
