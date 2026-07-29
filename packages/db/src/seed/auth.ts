import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import { createAuth } from "../auth/config";
import type * as schema from "../schema";
import { user } from "../schema/auth";

type Db = MySql2Database<typeof schema>;

export interface AdminSeedCredentials {
	email: string;
	password: string;
	name?: string;
}

export interface AdminSeedResult {
	status: "created" | "already-seeded";
	userId: string;
}

/**
 * Cria a única conta do painel (S09/A9), idempotente por e-mail: rodar de novo não
 * cria uma segunda conta nem troca a senha da existente — a checagem de existência
 * roda antes de qualquer escrita.
 *
 * Escreve pelo próprio Better Auth (`signUpEmail`, com `disableSignUp` reaberto só
 * para esta chamada), nunca por `INSERT` direto: hash de senha, geração de id e o
 * papel `admin` (`defaultValue` em `auth/config.ts`) seguem o mesmo caminho que
 * qualquer conta criada pelo Better Auth segue.
 */
export async function seedAdmin(
	db: Db,
	credentials: AdminSeedCredentials,
): Promise<AdminSeedResult> {
	const [existing] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, credentials.email));

	if (existing) return { status: "already-seeded", userId: existing.id };

	const seedAuth = createAuth(db, { disableSignUp: false });
	const result = await seedAuth.api.signUpEmail({
		body: {
			email: credentials.email,
			password: credentials.password,
			name: credentials.name ?? "Pesquisador",
		},
	});

	return { status: "created", userId: result.user.id };
}
