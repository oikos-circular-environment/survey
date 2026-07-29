import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

import { assertWithinBodyLimit, CHECKPOINT_MAX_BYTES } from "./body-size";

describe("assertWithinBodyLimit", () => {
	test("aceita um corpo bem abaixo do teto", () => {
		expect(() => assertWithinBodyLimit({ a: 1, b: [1, 2, 3] })).not.toThrow();
	});

	test("recusa corpo acima de 256 KB com PAYLOAD_TOO_LARGE, não uma falha genérica", () => {
		const oversized = { blob: "x".repeat(CHECKPOINT_MAX_BYTES + 1) };

		try {
			assertWithinBodyLimit(oversized);
			throw new Error("esperava que assertWithinBodyLimit lançasse");
		} catch (error) {
			expect(error).toBeInstanceOf(TRPCError);
			expect((error as TRPCError).code).toBe("PAYLOAD_TOO_LARGE");
		}
	});
});
