/**
 * Critério de aceite: o harness roda duas suítes em sequência sem vazar dado de uma
 * para a outra.
 *
 * As duas suítes vivem no mesmo arquivo de propósito. Em arquivos separados o
 * isolamento poderia vir do processo, e não do harness — aqui elas compartilham
 * processo, módulos e conexão de servidor, e mesmo assim a segunda encontra um banco
 * vazio. É o banco por suíte que garante isso, não o corredor de testes.
 */

import { describe, expect, test } from "bun:test";

import { sessions } from "../schema";
import { insertProtocolFixture, insertSession } from "./fixtures";
import { rowCount } from "./queries";
import { withEphemeralDatabase } from "./suite";

describe("primeira suíte", () => {
	const getDb = withEphemeralDatabase();

	test("grava uma sessão", async () => {
		const db = getDb();
		const { protocolVersionId } = await insertProtocolFixture(db);

		await insertSession(db, protocolVersionId);

		expect(await rowCount(db, sessions)).toBe(1);
	});
});

describe("segunda suíte", () => {
	const getDb = withEphemeralDatabase();

	test("começa sem nenhuma sessão", async () => {
		expect(await rowCount(getDb(), sessions)).toBe(0);
	});
});
