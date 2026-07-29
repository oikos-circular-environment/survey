import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
	createEphemeralDatabase,
	type EphemeralDatabase,
} from "@oikos-circular-environment/survey-db/testing/harness";
import { createTestAuth } from "@oikos-circular-environment/survey-db/testing/test-auth";
import { NextRequest } from "next/server";

import { buildDashboardGuardResponse } from "./proxy";

let ephemeral: EphemeralDatabase;
let auth: ReturnType<typeof createTestAuth>;

beforeAll(async () => {
	ephemeral = await createEphemeralDatabase();
	auth = createTestAuth(ephemeral.db);
});

afterAll(async () => {
	await ephemeral.destroy();
});

function requestFor(path: string, headers: Headers = new Headers()) {
	return new NextRequest(new URL(path, "http://localhost:3001"), { headers });
}

/** S10 AC: sessão ausente leva à entrada, preservando a rota pretendida em `?redirect=`. */
describe("buildDashboardGuardResponse", () => {
	test("sem sessão: redireciona para /login preservando a rota pretendida", async () => {
		const response = await buildDashboardGuardResponse(
			requestFor("/dashboard/testers?page=2"),
			auth,
		);

		expect(response.status).toBe(307);
		const location = new URL(response.headers.get("location") ?? "");
		expect(location.pathname).toBe("/login");
		expect(location.searchParams.get("redirect")).toBe(
			"/dashboard/testers?page=2",
		);
	});

	test("sessão de admin válida: deixa passar (sem redirecionar)", async () => {
		const signUp = await auth.api.signUpEmail({
			body: {
				email: "proxy-admin@example.com",
				password: "senha-forte-123",
				name: "Admin",
			},
		});
		const helpers = (await auth.$context).test;
		const { headers } = await helpers.login({ userId: signUp.user.id });

		const response = await buildDashboardGuardResponse(
			requestFor("/dashboard", headers),
			auth,
		);

		expect(response.headers.get("location")).toBeNull();
	});
});
