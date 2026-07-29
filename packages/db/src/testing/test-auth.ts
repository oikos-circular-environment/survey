/**
 * Instância do Better Auth só para teste: mesma forma de `auth/config.ts`, com
 * `disableSignUp: false` (testes criam contas à vontade) e o plugin `testUtils`, cujo
 * `test.login({ userId })` cria uma sessão válida direto no banco, sem round-trip de
 * sign-in — o único jeito de logar como um usuário sem papel `admin`, já que nenhum
 * fluxo normal cria um (S09, ver `auth/session.test.ts`).
 *
 * Fica fora de `auth/config.ts` (que não sabe de `testUtils`) para que o tipo de
 * `auth.$context.test` seja inferido no próprio `betterAuth(...)` daqui — atravessar
 * `testUtils()` por um parâmetro genérico `plugins: BetterAuthPlugin[]` apaga esse tipo.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import type { MySql2Database } from "drizzle-orm/mysql2";

import type * as schema from "../schema";
import { account, session, user, verification } from "../schema/auth";

export function createTestAuth(database: MySql2Database<typeof schema>) {
	return betterAuth({
		database: drizzleAdapter(database, {
			provider: "mysql",
			schema: { user, session, account, verification },
		}),
		emailAndPassword: {
			enabled: true,
			disableSignUp: false,
			autoSignIn: false,
		},
		user: {
			additionalFields: {
				role: {
					type: "string",
					required: true,
					input: false,
					defaultValue: "admin",
				},
			},
		},
		secret: "test-secret-not-used-outside-the-test-suite-min-32-chars",
		plugins: [testUtils()],
	});
}
