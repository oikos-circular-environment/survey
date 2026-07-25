/**
 * Banco efêmero para teste.
 *
 * Cada suíte cria um banco próprio, aplica as migrações versionadas nele e o apaga ao
 * terminar. É mais caro que truncar tabelas entre testes, e é de propósito: truncar
 * deixa passar erro de migração, porque as tabelas continuam sendo as que o `push`
 * criou uma vez. Aqui o caminho exercitado é exatamente o que roda em produção — se uma
 * migração não aplica de banco vazio, nenhum teste passa.
 *
 * O isolamento é por banco, não por transação, porque o que precisa ser verificado
 * inclui auto-incremento e exclusão em cascata — comportamento de DDL que uma
 * transação revertida esconderia.
 */

import { randomUUID } from "node:crypto";

import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

import { createPool } from "../client";
import * as schema from "../schema";

export type TestDatabase = MySql2Database<typeof schema>;

const migrationsFolder = new URL("../migrations", import.meta.url).pathname;

/**
 * Credencial usada pelo harness.
 *
 * `TEST_DATABASE_URL` existe para a integração contínua, onde o servidor de teste não é
 * o do desenvolvimento. Sem ela, cai no `DATABASE_URL` local — que tem permissão sobre
 * `survey_test_%` por conta do script de inicialização do compose.
 *
 * Lê `process.env` direto, sem passar por `@survey/env`, porque isto não é código de
 * runtime: declarar uma variável só de teste no contrato de ambiente da aplicação faria
 * a borda de produção validar algo que ela nunca usa.
 */
function baseUrl(): URL {
	const raw = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

	if (!raw) {
		throw new Error(
			"Harness de teste sem banco: defina TEST_DATABASE_URL ou DATABASE_URL. " +
				"Em desenvolvimento, `bun db:start` sobe o MySQL e apps/web/.env traz a credencial.",
		);
	}

	return new URL(raw);
}

export interface EphemeralDatabase {
	db: TestDatabase;
	/** Nome do banco criado. Útil em mensagem de erro quando algo escapa da limpeza. */
	databaseName: string;
	/** Encerra a conexão e apaga o banco. Idempotente. */
	destroy(): Promise<void>;
}

export async function createEphemeralDatabase(): Promise<EphemeralDatabase> {
	const url = baseUrl();
	// Identificador de banco no MySQL cabe em 64 caracteres; este usa 44.
	const databaseName = `survey_test_${randomUUID().replaceAll("-", "")}`;

	const serverUrl = new URL(url);
	serverUrl.pathname = "/";

	const admin = await mysql.createConnection(serverUrl.toString());
	try {
		await admin.query(`CREATE DATABASE \`${databaseName}\``);
	} finally {
		await admin.end();
	}

	const databaseUrl = new URL(url);
	databaseUrl.pathname = `/${databaseName}`;

	// Mesmo caminho de conexão da aplicação, para que o fuso da sessão seja o mesmo.
	const pool = createPool(databaseUrl.toString());

	const db = drizzle(pool, { schema, mode: "default" });

	let destroyed = false;

	const destroy = async () => {
		if (destroyed) return;
		destroyed = true;

		await pool.end();

		const cleanup = await mysql.createConnection(serverUrl.toString());
		try {
			await cleanup.query(`DROP DATABASE \`${databaseName}\``);
		} finally {
			await cleanup.end();
		}
	};

	try {
		await migrate(db, { migrationsFolder });
	} catch (error) {
		await destroy();
		throw error;
	}

	return { db, databaseName, destroy };
}
