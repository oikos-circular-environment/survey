import "../load-env";

import { createDb } from "../index";
import { seedAdmin } from "./auth";

/**
 * Lidas direto de `process.env`, sem passar por `@survey/env` (mesmo motivo do
 * `TEST_DATABASE_URL` em `testing/harness.ts`): só este script usa estas variáveis —
 * declará-las no contrato de ambiente da aplicação faria toda a borda de produção
 * validar algo que ela nunca lê.
 */
function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`Seed de administrador sem ${name}: defina no .env antes de rodar \`bun run db:seed:auth\`.`,
		);
	}
	return value;
}

const db = createDb();
const result = await seedAdmin(db, {
	email: requiredEnv("ADMIN_SEED_EMAIL"),
	password: requiredEnv("ADMIN_SEED_PASSWORD"),
});

console.log(
	result.status === "created"
		? `Conta administradora criada (${result.userId}).`
		: `Conta administradora já existia (${result.userId}), nada a fazer.`,
);

process.exit(0);
