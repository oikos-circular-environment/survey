import { randomUUID } from "node:crypto";

import { protocol } from "@oikos-circular-environment/survey-db/protocol/data";
import {
	createRepositories,
	type Repositories,
} from "@oikos-circular-environment/survey-db/repositories/index";
import { seedProtocol } from "@oikos-circular-environment/survey-db/seed/seed";
import {
	createEphemeralDatabase,
	type EphemeralDatabase,
} from "@oikos-circular-environment/survey-db/testing/harness";

import type { UsabilitySessionUpsertInput } from "../routers/usability-schemas";

/**
 * Helper de teste dos use-cases de `usability.*` — não é um arquivo `*.test.ts`, então o
 * `bun test` não o executa como suíte, só como suporte. Semeia o protocolo real
 * (`protocol/data.ts`), não um fixture mínimo: os critérios de aceite de S04
 * exigem tarefa com composição `all` (T16) e com casamento por parâmetro de busca
 * (T8), que só o protocolo real tem.
 */
export interface UsabilityTestSetup {
	ephemeral: EphemeralDatabase;
	repositories: Repositories;
}

export async function setupUsabilityTest(): Promise<UsabilityTestSetup> {
	const ephemeral = await createEphemeralDatabase();
	await seedProtocol(ephemeral.db, protocol);
	return { ephemeral, repositories: createRepositories(ephemeral.db) };
}

/** Corpo válido de `usability.session.upsert` para a persona CITIZEN (S1). */
export function buildSessionUpsertInput(
	overrides: Partial<UsabilitySessionUpsertInput> = {},
): UsabilitySessionUpsertInput {
	return {
		session_id: randomUUID(),
		protocol_key: protocol.key,
		protocol_version: protocol.version,
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
		...overrides,
	};
}
