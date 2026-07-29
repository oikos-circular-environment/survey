/**
 * Fábrica da instância do Better Auth (S09/A9): provedor de e-mail e senha, adaptador
 * Drizzle, mesmo banco MySQL do resto do pacote — sem nenhuma chave estrangeira para as
 * tabelas `usability_*` (ver `schema/auth.ts`).
 *
 * É fábrica, e não só uma instância única, pelo mesmo motivo de `createDb` existir ao
 * lado de `db` em `index.ts`: os testes sobem um banco efêmero por suíte e precisam de
 * uma instância amarrada a ele, não à conexão singleton de produção.
 *
 * `disableSignUp: true` (padrão) fecha o cadastro público (S09: "sem cadastro público,
 * sem convite"). O seed (`seed/auth.ts`) é o único ponto que passa `false` — só para a
 * chamada que cria a conta única, nunca para a instância que serve requisição.
 *
 * `role` é `input: false` com `defaultValue: "admin"`: ninguém além do próprio Better
 * Auth grava esse campo, e todo registro criado recebe o mesmo papel — o único que vai
 * existir por muito tempo (S09).
 *
 * Também é a fonte de verdade lida pelo `better-auth generate` do CLI (`db:auth:generate`)
 * para regenerar `schema/auth.ts` quando esta configuração mudar.
 */

import { env } from "@survey/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { MySql2Database } from "drizzle-orm/mysql2";

import { db } from "../index";
import type * as schema from "../schema";
import { account, session, user, verification } from "../schema/auth";

export interface CreateAuthOptions {
	disableSignUp?: boolean;
}

export function createAuth(
	database: MySql2Database<typeof schema>,
	options: CreateAuthOptions = {},
) {
	return betterAuth({
		database: drizzleAdapter(database, {
			provider: "mysql",
			schema: { user, session, account, verification },
		}),
		emailAndPassword: {
			enabled: true,
			disableSignUp: options.disableSignUp ?? true,
			// sem sessão automática no cadastro: o único chamador é o seed (S09), que não
			// precisa de sessão, só da conta criada
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
		secret: env.BETTER_AUTH_SECRET,
	});
}

export const auth = createAuth(db);
