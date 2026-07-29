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
 * Checa a chave de cliente global (A5/S08) antes de qualquer acesso ao banco. Chamada
 * explicitamente no início de cada procedure pública de `usability.*` — não é
 * middleware tRPC genérico de propósito: um middleware aplicado à `publicProcedure`
 * base exigiria lista de exceções para as procedures do painel (`dashboard.*`), e é a
 * lista de exceções que erra (S08).
 */
export function assertClientKey(headers: Headers): void {
	const provided = headers.get(HEADER_NAME);
	if (!provided || !keysMatch(provided, env.USABILITY_CLIENT_KEY)) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Chave de cliente ausente ou inválida.",
		});
	}
}
