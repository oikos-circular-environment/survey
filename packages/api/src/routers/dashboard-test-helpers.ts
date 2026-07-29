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
import { createTestAuth } from "@oikos-circular-environment/survey-db/testing/test-auth";

/**
 * Helper de teste de `dashboard.*` — não é `*.test.ts`, o `bun test` não roda como
 * suíte. Semeia o protocolo real para as procedures de leitura não caírem num banco
 * vazio demais para exercitar as agregações.
 */
export interface DashboardTestSetup {
	ephemeral: EphemeralDatabase;
	repositories: Repositories;
	auth: ReturnType<typeof createTestAuth>;
}

export async function setupDashboardTest(): Promise<DashboardTestSetup> {
	const ephemeral = await createEphemeralDatabase();
	await seedProtocol(ephemeral.db, protocol);

	// `createTestAuth`: só para os testes construírem uma sessão de administrador sem
	// passar pela tela de login real (`testUtils`, ver a nota lá).
	const auth = createTestAuth(ephemeral.db);

	return { ephemeral, repositories: createRepositories(ephemeral.db), auth };
}

/** Cria uma conta com papel admin e devolve cabeçalhos com sessão válida para ela. */
export async function createAdminSessionHeaders(
	auth: DashboardTestSetup["auth"],
): Promise<Headers> {
	const email = `admin-${randomUUID()}@example.com`;
	const signUp = await auth.api.signUpEmail({
		body: { email, password: "senha-forte-123", name: "Admin de teste" },
	});

	const helpers = (await auth.$context).test;
	const { headers } = await helpers.login({ userId: signUp.user.id });
	return headers;
}
