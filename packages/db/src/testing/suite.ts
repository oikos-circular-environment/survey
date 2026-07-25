/**
 * Amarra o banco efêmero ao ciclo de vida de uma suíte do `bun:test`.
 *
 * Vive separado de `harness.ts` para que o harness continue utilizável fora de um
 * arquivo de teste — por exemplo, num script que queira um banco descartável.
 */

import { afterAll, beforeAll } from "bun:test";

import { createEphemeralDatabase, type TestDatabase } from "./harness";

/**
 * Sobe um banco limpo antes da suíte e o derruba ao fim.
 *
 * Devolve um acessor, e não o banco, porque a conexão só existe depois do `beforeAll` —
 * uma referência capturada no corpo do `describe` estaria indefinida.
 *
 * ```ts
 * const getDb = withEphemeralDatabase();
 *
 * test("grava uma sessão", async () => {
 *   await getDb().insert(sessions).values(...);
 * });
 * ```
 */
export function withEphemeralDatabase(): () => TestDatabase {
	let ephemeral:
		| Awaited<ReturnType<typeof createEphemeralDatabase>>
		| undefined;

	beforeAll(async () => {
		ephemeral = await createEphemeralDatabase();
	});

	afterAll(async () => {
		await ephemeral?.destroy();
		ephemeral = undefined;
	});

	return () => {
		if (!ephemeral) {
			throw new Error(
				"Banco efêmero indisponível: use o acessor dentro de um teste.",
			);
		}

		return ephemeral.db;
	};
}
