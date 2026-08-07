import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import type { Protocol } from "../protocol/types";
import {
	personaDefs,
	protocolVersions,
	questions,
	sessions,
	suiteDefs,
	taskDefs,
} from "../schema";
import { insertSession } from "../testing/fixtures";
import { rowCount } from "../testing/queries";
import { withEphemeralDatabase } from "../testing/suite";
import { seedProtocol } from "./seed";

function minimalProtocol(
	key: string,
	version: number,
	taskTitle: string,
): Protocol {
	return {
		key,
		version,
		tasks: [
			{
				code: "T1",
				title: taskTitle,
				instruction: "Faça a coisa.",
				success: { mode: "any", signals: [{ kind: "screen", route: "/x" }] },
			},
		],
		suites: [
			{
				code: "S1",
				title: "Suíte 1",
				objective: "Objetivo.",
				task_codes: ["T1"],
			},
		],
		personas: [
			{
				key: "CITIZEN",
				label: "Cidadão",
				description: "Descrição.",
				suites: [{ suite_code: "S1", specific_objectives: [] }],
			},
		],
		questions: [
			{
				key: "satisfaction",
				scope: "PER_SUITE",
				position: 1,
				type: "SCALE",
				required: true,
				label: "Satisfação?",
				options: [
					{ value: 1, key: "BAD", label: "Ruim" },
					{ value: 2, key: "GOOD", label: "Bom" },
				],
			},
		],
	};
}

describe("seedProtocol", () => {
	const getDb = withEphemeralDatabase();

	test("rodar 2x seguidas deixa o banco idêntico ao estado após a primeira", async () => {
		const db = getDb();
		const protocol = minimalProtocol("test-seed-idempotency", 1, "Tarefa 1");

		const first = await seedProtocol(db, protocol);
		expect(first.status).toBe("created");

		const counts = {
			suites: await rowCount(db, suiteDefs),
			tasks: await rowCount(db, taskDefs),
			personas: await rowCount(db, personaDefs),
			questions: await rowCount(db, questions),
		};

		const second = await seedProtocol(db, protocol);
		expect(second.status).toBe("already-seeded");
		expect(second.protocolVersionId).toBe(first.protocolVersionId);

		expect(await rowCount(db, suiteDefs)).toBe(counts.suites);
		expect(await rowCount(db, taskDefs)).toBe(counts.tasks);
		expect(await rowCount(db, personaDefs)).toBe(counts.personas);
		expect(await rowCount(db, questions)).toBe(counts.questions);
	});

	test("publicar versão nova cria um conjunto completo novo, mantendo a anterior intacta", async () => {
		const db = getDb();
		const key = "test-seed-versioning";
		const v1 = minimalProtocol(key, 1, "Tarefa versão 1");
		const v2 = minimalProtocol(key, 2, "Tarefa versão 2");

		const seededV1 = await seedProtocol(db, v1);
		const seededV2 = await seedProtocol(db, v2);
		expect(seededV1.protocolVersionId).not.toBe(seededV2.protocolVersionId);

		const [suiteV1] = await db
			.select()
			.from(suiteDefs)
			.where(eq(suiteDefs.protocolVersionId, seededV1.protocolVersionId));
		const [suiteV2] = await db
			.select()
			.from(suiteDefs)
			.where(eq(suiteDefs.protocolVersionId, seededV2.protocolVersionId));
		if (!suiteV1 || !suiteV2)
			throw new Error("esperava encontrar as duas suítes");

		const [taskV1] = await db
			.select()
			.from(taskDefs)
			.where(eq(taskDefs.suiteId, suiteV1.id));
		const [taskV2] = await db
			.select()
			.from(taskDefs)
			.where(eq(taskDefs.suiteId, suiteV2.id));

		expect(taskV1?.title).toBe("Tarefa versão 1");
		expect(taskV2?.title).toBe("Tarefa versão 2");
	});

	test("publicar versão nova a entrega e tira a anterior de circulação", async () => {
		const db = getDb();
		const key = "test-seed-single-active";

		const seededV1 = await seedProtocol(db, minimalProtocol(key, 1, "v1"));
		const seededV2 = await seedProtocol(db, minimalProtocol(key, 2, "v2"));
		const seededV3 = await seedProtocol(db, minimalProtocol(key, 3, "v3"));

		const rows = await db
			.select({
				id: protocolVersions.id,
				version: protocolVersions.version,
				isActive: protocolVersions.isActive,
			})
			.from(protocolVersions)
			.where(eq(protocolVersions.key, key));

		const active = rows.filter((row) => row.isActive);
		expect(active.length).toBe(1);
		expect(active[0]?.id).toBe(seededV3.protocolVersionId);
		expect(
			rows.find((row) => row.id === seededV1.protocolVersionId)?.isActive,
		).toBe(false);
		expect(
			rows.find((row) => row.id === seededV2.protocolVersionId)?.isActive,
		).toBe(false);
	});

	test("sessão presa à versão antiga continua resolvendo depois de uma versão nova publicada", async () => {
		const db = getDb();
		const key = "test-seed-old-session-resolves";
		const v1 = minimalProtocol(key, 1, "Tarefa v1");
		const v2 = minimalProtocol(key, 2, "Tarefa v2");

		const seededV1 = await seedProtocol(db, v1);
		const sessionId = await insertSession(db, seededV1.protocolVersionId);

		await seedProtocol(db, v2);

		const [session] = await db
			.select()
			.from(sessions)
			.where(eq(sessions.id, sessionId));
		if (!session) throw new Error("esperava encontrar a sessão");
		expect(session.protocolVersionId).toBe(seededV1.protocolVersionId);

		const [suite] = await db
			.select()
			.from(suiteDefs)
			.where(eq(suiteDefs.protocolVersionId, session.protocolVersionId));
		if (!suite) throw new Error("esperava encontrar a suíte da versão 1");

		const [task] = await db
			.select()
			.from(taskDefs)
			.where(eq(taskDefs.suiteId, suite.id));
		expect(task?.title).toBe("Tarefa v1");
	});
});
