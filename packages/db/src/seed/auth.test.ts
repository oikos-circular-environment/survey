import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { createAuth } from "../auth/config";
import { account, user } from "../schema/auth";
import { withEphemeralDatabase } from "../testing/suite";
import { seedAdmin } from "./auth";

describe("seedAdmin", () => {
	const getDb = withEphemeralDatabase();

	test("rodar 2x seguidas deixa exatamente uma conta, e a senha original continua entrando", async () => {
		const db = getDb();
		const credentials = {
			email: "pesquisador@example.com",
			password: "senha-forte-123",
		};

		const first = await seedAdmin(db, credentials);
		expect(first.status).toBe("created");

		const second = await seedAdmin(db, credentials);
		expect(second.status).toBe("already-seeded");
		expect(second.userId).toBe(first.userId);

		const rows = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, credentials.email));
		expect(rows).toHaveLength(1);

		// a senha da chamada original ainda entra — a segunda chamada não trocou nada
		const prodLikeAuth = createAuth(db);
		const login = await prodLikeAuth.api.signInEmail({ body: credentials });
		expect(login.user.email).toBe(credentials.email);
	});

	test("papel admin é gravado desde a criação", async () => {
		const db = getDb();
		const result = await seedAdmin(db, {
			email: "papel@example.com",
			password: "senha-forte-123",
		});

		const [row] = await db
			.select({ role: user.role })
			.from(user)
			.where(eq(user.id, result.userId));
		expect(row?.role).toBe("admin");
	});

	test("a senha nunca aparece em texto claro na tabela de contas", async () => {
		const db = getDb();
		const credentials = {
			email: "hash@example.com",
			password: "senha-super-secreta-e-unica",
		};
		await seedAdmin(db, credentials);

		const [row] = await db.select({ password: account.password }).from(account);

		expect(row?.password).toBeDefined();
		expect(row?.password).not.toBe(credentials.password);
		expect(row?.password?.includes(credentials.password)).toBe(false);
	});
});
