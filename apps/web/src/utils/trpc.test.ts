import { describe, expect, test } from "bun:test";
import { env } from "@survey/env/web";

import { clientHeaders } from "./trpc";

/**
 * S08 estendido: o `httpBatchLink` do próprio `web` manda `x-client-key` em toda
 * chamada tRPC contra o próprio backend, sem precisar que cada tela adicione o
 * cabeçalho manualmente — é o `headers()` do link (`clientHeaders`) que já vem por
 * padrão.
 */
describe("clientHeaders", () => {
	test("inclui x-client-key com o valor público configurado", () => {
		expect(clientHeaders()).toEqual({
			"x-client-key": env.NEXT_PUBLIC_CLIENT_API_KEY,
		});
	});
});
