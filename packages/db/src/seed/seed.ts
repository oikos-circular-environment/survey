import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import type { Protocol, SuiteCode } from "../protocol/types";
import { validateProtocol } from "../protocol/validate";
import type * as schema from "../schema";
import {
	personaDefs,
	personaSuites,
	protocolVersions,
	questions,
	suiteDefs,
	taskDefs,
} from "../schema";

type Db = MySql2Database<typeof schema>;

export interface SeedResult {
	status: "created" | "already-seeded";
	protocolVersionId: string;
}

/**
 * Materializa `protocol` nas tabelas de protocolo. Idempotente por `(key, version)`:
 * uma versão já publicada nunca é tocada de novo, e uma versão nova é sempre um conjunto
 * de linhas com IDs novos — nunca um `UPDATE` sobre a anterior.
 */
export async function seedProtocol(
	db: Db,
	protocol: Protocol,
): Promise<SeedResult> {
	validateProtocol(protocol);

	const [existing] = await db
		.select({ id: protocolVersions.id })
		.from(protocolVersions)
		.where(
			and(
				eq(protocolVersions.key, protocol.key),
				eq(protocolVersions.version, protocol.version),
			),
		);

	if (existing)
		return { status: "already-seeded", protocolVersionId: existing.id };

	return db.transaction(async (tx) => {
		const protocolVersionId = randomUUID();
		await tx.insert(protocolVersions).values({
			id: protocolVersionId,
			key: protocol.key,
			version: protocol.version,
		});

		const taskByCode = new Map(protocol.tasks.map((task) => [task.code, task]));
		const suiteIdByCode = new Map<SuiteCode, string>();

		for (const suite of protocol.suites) {
			const suiteId = randomUUID();
			suiteIdByCode.set(suite.code, suiteId);

			await tx.insert(suiteDefs).values({
				id: suiteId,
				protocolVersionId,
				code: suite.code,
				title: suite.title,
				objective: suite.objective,
			});

			for (const [position, taskCode] of suite.task_codes.entries()) {
				const task = taskByCode.get(taskCode);
				if (!task) continue;

				await tx.insert(taskDefs).values({
					id: randomUUID(),
					suiteId,
					code: task.code,
					title: task.title,
					instruction: task.instruction,
					position,
					successRule: task.success,
				});
			}
		}

		for (const [position, persona] of protocol.personas.entries()) {
			const personaId = randomUUID();
			await tx.insert(personaDefs).values({
				id: personaId,
				protocolVersionId,
				key: persona.key,
				label: persona.label,
				description: persona.description,
				position,
			});

			for (const [suitePosition, personaSuite] of persona.suites.entries()) {
				const suiteId = suiteIdByCode.get(personaSuite.suite_code);
				if (!suiteId) continue;

				await tx.insert(personaSuites).values({
					personaId,
					suiteId,
					position: suitePosition,
					specificObjectives: personaSuite.specific_objectives,
				});
			}
		}

		for (const question of protocol.questions) {
			await tx.insert(questions).values({
				id: randomUUID(),
				protocolVersionId,
				key: question.key,
				scope: question.scope,
				type: question.type,
				position: question.position,
				label: question.label,
				helperText: question.helper_text,
				infoText: question.info_text,
				required: question.required,
				options: "options" in question ? question.options : undefined,
				maxLength: question.type === "TEXT" ? question.max_length : undefined,
				dependsOn: question.depends_on,
			});
		}

		return { status: "created", protocolVersionId };
	});
}
