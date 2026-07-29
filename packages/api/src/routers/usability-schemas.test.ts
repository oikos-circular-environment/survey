import { describe, expect, test } from "bun:test";

import { buildSessionUpsertInput } from "../use-cases/usability-test-helpers";
import { usabilitySessionUpsertInput } from "./usability-schemas";

/**
 * S05: "estado da federação inexistente" e "escala fora de 1..5" precisam ser
 * recusados sem gravar nada — testado aqui, na validação de entrada, porque um corpo
 * que não passa no zod nunca chega ao use-case nem ao repositório.
 */
describe("usabilitySessionUpsertInput", () => {
	test("aceita um corpo válido", () => {
		const result = usabilitySessionUpsertInput.safeParse(
			buildSessionUpsertInput(),
		);
		expect(result.success).toBe(true);
	});

	test("recusa estado da federação inexistente", () => {
		const input = buildSessionUpsertInput();
		const result = usabilitySessionUpsertInput.safeParse({
			...input,
			screener: { ...input.screener, state_uf: "ZZ" },
		});
		expect(result.success).toBe(false);
	});

	test("recusa waste_contact_frequency fora de 1..5", () => {
		const input = buildSessionUpsertInput();
		const result = usabilitySessionUpsertInput.safeParse({
			...input,
			screener: { ...input.screener, waste_contact_frequency: 7 },
		});
		expect(result.success).toBe(false);
	});

	test("recusa app_experience fora de 1..5", () => {
		const input = buildSessionUpsertInput();
		const result = usabilitySessionUpsertInput.safeParse({
			...input,
			screener: { ...input.screener, app_experience: 0 },
		});
		expect(result.success).toBe(false);
	});
});
