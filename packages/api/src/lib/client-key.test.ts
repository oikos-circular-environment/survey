import { describe, expect, test } from "bun:test";
import { env } from "@survey/env/server";
import { TRPCError } from "@trpc/server";

import { assertClientKey } from "./client-key";

describe("assertClientKey", () => {
	test("aceita a chave correta", () => {
		const headers = new Headers({
			"x-client-key": env.USABILITY_CLIENT_KEY,
		});
		expect(() => assertClientKey(headers)).not.toThrow();
	});

	test("recusa requisição sem chave, antes de qualquer outra checagem", () => {
		expect(() => assertClientKey(new Headers())).toThrow(TRPCError);
		try {
			assertClientKey(new Headers());
		} catch (error) {
			expect(error).toBeInstanceOf(TRPCError);
			expect((error as TRPCError).code).toBe("UNAUTHORIZED");
		}
	});

	test("recusa chave errada", () => {
		const headers = new Headers({ "x-client-key": "chave-errada" });
		try {
			assertClientKey(headers);
			throw new Error("esperava que assertClientKey lançasse");
		} catch (error) {
			expect(error).toBeInstanceOf(TRPCError);
			expect((error as TRPCError).code).toBe("UNAUTHORIZED");
		}
	});
});
