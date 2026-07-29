import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { user } from "../schema/auth";
import { withEphemeralDatabase } from "../testing/suite";
import { createTestAuth } from "../testing/test-auth";
import { resolveAdminSession } from "./session";

describe("resolveAdminSession", () => {
	const getDb = withEphemeralDatabase();

	test("sem cabeçalho de sessão nenhuma: recusa", async () => {
		const auth = createTestAuth(getDb());
		const resolved = await resolveAdminSession(new Headers(), auth);
		expect(resolved).toBeNull();
	});

	test("sessão de uma conta com papel admin: aceita", async () => {
		const db = getDb();
		const auth = createTestAuth(db);

		const signUp = await auth.api.signUpEmail({
			body: {
				email: "admin@example.com",
				password: "senha-forte-123",
				name: "Admin",
			},
		});

		const helpers = (await auth.$context).test;
		const { headers } = await helpers.login({ userId: signUp.user.id });

		const resolved = await resolveAdminSession(headers, auth);
		expect(resolved?.user.email).toBe("admin@example.com");
	});

	/**
	 * S09 AC: "um usuário sem papel de administrador é recusado pelo utilitário de
	 * autorização — mesmo não havendo hoje como criar um". Como o cadastro sempre grava
	 * `role: "admin"` (`defaultValue` em `config.ts`), o único jeito de ter uma conta
	 * sem esse papel é escrever a linha direto no banco de teste.
	 */
	test("sessão válida de uma conta sem papel admin: recusa", async () => {
		const db = getDb();
		const auth = createTestAuth(db);

		const userId = randomUUID();
		await db.insert(user).values({
			id: userId,
			name: "Sem papel admin",
			email: "sem-papel@example.com",
			emailVerified: true,
			role: "member",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const helpers = (await auth.$context).test;
		const { headers } = await helpers.login({ userId });

		const resolved = await resolveAdminSession(headers, auth);
		expect(resolved).toBeNull();
	});
});
