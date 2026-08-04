import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { protocolVersions } from "../schema/protocol";
import {
	createEphemeralDatabase,
	type EphemeralDatabase,
} from "../testing/harness";
import { ProtocolRepository } from "./protocol-repository";

async function insertVersion(
	ephemeral: EphemeralDatabase,
	overrides: { key?: string; version: number; isActive?: boolean },
): Promise<string> {
	const id = randomUUID();
	await ephemeral.db.insert(protocolVersions).values({
		id,
		key: overrides.key ?? "oikos-walkthrough",
		version: overrides.version,
		isActive: overrides.isActive ?? true,
	});
	return id;
}

describe("ProtocolRepository.getActiveProtocolVersion", () => {
	test("escolhe a versão ativa", async () => {
		const ephemeral = await createEphemeralDatabase();
		try {
			const repository = new ProtocolRepository(ephemeral.db);
			const id = await insertVersion(ephemeral, { version: 1 });

			const active = await repository.getActiveProtocolVersion();

			expect(active?.id).toBe(id);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("versão mais nova porém inativa perde para uma mais antiga ativa", async () => {
		const ephemeral = await createEphemeralDatabase();
		try {
			const repository = new ProtocolRepository(ephemeral.db);
			const olderActive = await insertVersion(ephemeral, {
				version: 1,
				isActive: true,
			});
			await insertVersion(ephemeral, { version: 2, isActive: false });

			const active = await repository.getActiveProtocolVersion();

			expect(active?.id).toBe(olderActive);
			expect(active?.version).toBe(1);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("nenhuma versão ativa devolve null", async () => {
		const ephemeral = await createEphemeralDatabase();
		try {
			const repository = new ProtocolRepository(ephemeral.db);
			await insertVersion(ephemeral, { version: 1, isActive: false });

			const active = await repository.getActiveProtocolVersion();

			expect(active).toBeNull();
		} finally {
			await ephemeral.destroy();
		}
	});

	test("key nunca semeada continua lançando o erro de seed ausente", async () => {
		const ephemeral = await createEphemeralDatabase();
		try {
			const repository = new ProtocolRepository(ephemeral.db);

			await expect(
				repository.getActiveProtocolVersion("nunca-semeada"),
			).rejects.toThrow(/não está semeado/);
		} finally {
			await ephemeral.destroy();
		}
	});
});

describe("ProtocolRepository.setProtocolVersionActive", () => {
	test("ativar uma versão desativa as irmãs da mesma key", async () => {
		const ephemeral = await createEphemeralDatabase();
		try {
			const repository = new ProtocolRepository(ephemeral.db);
			const v1 = await insertVersion(ephemeral, { version: 1, isActive: true });
			const v2 = await insertVersion(ephemeral, {
				version: 2,
				isActive: false,
			});

			await repository.setProtocolVersionActive(v2, true);

			const versions = await repository.listProtocolVersions();
			const byId = new Map(versions.map((row) => [row.id, row.isActive]));
			expect(byId.get(v1)).toBe(false);
			expect(byId.get(v2)).toBe(true);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("desativar não exige ativar outra — desliga tudo para a key", async () => {
		const ephemeral = await createEphemeralDatabase();
		try {
			const repository = new ProtocolRepository(ephemeral.db);
			const id = await insertVersion(ephemeral, { version: 1, isActive: true });

			await repository.setProtocolVersionActive(id, false);

			const active = await repository.getActiveProtocolVersion();
			expect(active).toBeNull();
		} finally {
			await ephemeral.destroy();
		}
	});
});
