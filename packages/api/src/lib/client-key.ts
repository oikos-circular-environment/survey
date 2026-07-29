import { timingSafeEqual } from "node:crypto";

import { env } from "@survey/env/server";
import { TRPCError } from "@trpc/server";

const HEADER_NAME = "x-client-key";

function keysMatch(a: string, b: string): boolean {
	const bufferA = Buffer.from(a);
	const bufferB = Buffer.from(b);
	if (bufferA.length !== bufferB.length) return false;
	return timingSafeEqual(bufferA, bufferB);
}

/**
 * Checa a chave de cliente global (A5/S08, estendida a toda procedure tRPC — ver
 * `apiKeyProcedure` em `index.ts`). Barreira baixa contra curl/acesso programático
 * direto — mobile e o frontend do `web` mandam o mesmo valor, inclusive o próprio
 * `web` contra o próprio backend (`utils/trpc.ts`). Não é segredo forte: o valor
 * exposto ao `web` roda no navegador via `NEXT_PUBLIC_CLIENT_API_KEY`, aceito como
 * trade-off explícito — controle de acesso de verdade é o Better Auth (S09/S10).
 */
export function assertClientKey(headers: Headers): void {
	const provided = headers.get(HEADER_NAME);
	if (!provided || !keysMatch(provided, env.CLIENT_API_KEY)) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Chave de cliente ausente ou inválida.",
		});
	}
}
