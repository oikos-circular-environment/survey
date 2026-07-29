import { TRPCError } from "@trpc/server";

/** Teto de corpo (R4/S08): 256 KB, hoje só aplicado a `usability.checkpoint.send`. */
export const CHECKPOINT_MAX_BYTES = 256 * 1024;

/**
 * Mede o input já validado (não o corpo HTTP cru) e recusa acima do teto. Medir o
 * input em vez do `Content-Length` da requisição evita depender de como o transporte
 * empacota a chamada (o adaptador fetch do tRPC pode agrupar mais de uma procedure num
 * único POST) — o que importa aqui é o tamanho do bloco do checkpoint em si, e o schema
 * dele é json puro, então o tamanho serializado do input já validado é a medida certa.
 */
export function assertWithinBodyLimit(
	input: unknown,
	maxBytes = CHECKPOINT_MAX_BYTES,
): void {
	const size = Buffer.byteLength(JSON.stringify(input), "utf8");
	if (size > maxBytes) {
		throw new TRPCError({
			code: "PAYLOAD_TOO_LARGE",
			message: `Corpo do checkpoint excede o limite de ${maxBytes} bytes (recebido ${size}).`,
		});
	}
}
