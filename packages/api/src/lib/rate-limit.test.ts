import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

import { clientIpFrom, RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
	test("permite até o limite e recusa a requisição seguinte com TOO_MANY_REQUESTS", () => {
		const limiter = new RateLimiter(3, 60_000);
		const now = Date.now();
		limiter.check("1.2.3.4", now);
		limiter.check("1.2.3.4", now);
		limiter.check("1.2.3.4", now);

		try {
			limiter.check("1.2.3.4", now);
			throw new Error("esperava que check lançasse");
		} catch (error) {
			expect(error).toBeInstanceOf(TRPCError);
			expect((error as TRPCError).code).toBe("TOO_MANY_REQUESTS");
		}
	});

	test("reseta a contagem ao virar a janela", () => {
		const limiter = new RateLimiter(1, 1_000);
		const now = Date.now();
		limiter.check("9.9.9.9", now);

		expect(() => limiter.check("9.9.9.9", now + 1_001)).not.toThrow();
	});

	test("IPs diferentes têm contagens independentes", () => {
		const limiter = new RateLimiter(1, 60_000);
		const now = Date.now();
		limiter.check("1.1.1.1", now);

		expect(() => limiter.check("2.2.2.2", now)).not.toThrow();
	});
});

describe("clientIpFrom", () => {
	test("usa o primeiro IP de x-forwarded-for", () => {
		const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
		expect(clientIpFrom(headers)).toBe("1.1.1.1");
	});

	test("cai para x-real-ip quando x-forwarded-for está ausente", () => {
		const headers = new Headers({ "x-real-ip": "3.3.3.3" });
		expect(clientIpFrom(headers)).toBe("3.3.3.3");
	});

	test("degrada para uma chave fixa sem nenhum header de IP", () => {
		expect(clientIpFrom(new Headers())).toBe("unknown");
	});
});
