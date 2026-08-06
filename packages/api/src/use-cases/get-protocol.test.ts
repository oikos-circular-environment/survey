import { describe, expect, test } from "bun:test";
import { protocol } from "@oikos-circular-environment/survey-db/protocol/data";
import { protocolVersions } from "@oikos-circular-environment/survey-db/schema/protocol";
import { eq } from "drizzle-orm";

import { getProtocol } from "./get-protocol";
import { setupUsabilityTest } from "./usability-test-helpers";

describe("getProtocol", () => {
	test("a resposta valida contra o formato documentado em E1", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const response = await getProtocol(repositories);
			if (!response)
				throw new Error("protocolo deveria estar ativo por padrão");

			expect(response.key).toBe(protocol.key);
			expect(response.version).toBe(protocol.version);
			expect(response.personas.length).toBe(protocol.personas.length);
			expect(response.suites.length).toBe(protocol.suites.length);
			expect(response.tasks.length).toBe(protocol.tasks.length);
			expect(response.questions.length).toBe(protocol.questions.length);

			for (const persona of response.personas) {
				expect(typeof persona.key).toBe("string");
				expect(typeof persona.label).toBe("string");
				expect(typeof persona.description).toBe("string");
				expect(Array.isArray(persona.suites)).toBe(true);
				expect(persona.suites.length).toBeGreaterThan(0);
				for (const suite of persona.suites) {
					expect(typeof suite.suite_code).toBe("string");
					expect(Array.isArray(suite.specific_objectives)).toBe(true);
				}
			}

			for (const suite of response.suites) {
				expect(typeof suite.title).toBe("string");
				expect(typeof suite.objective).toBe("string");
				expect(Array.isArray(suite.task_codes)).toBe(true);
				expect(suite.task_codes.length).toBeGreaterThan(0);
			}

			for (const question of response.questions) {
				expect(["SCREENER", "PER_SUITE", "FINAL"]).toContain(question.scope);
				expect(["SCALE", "CHOICE", "TEXT"]).toContain(question.type);
				expect(typeof question.required).toBe("boolean");
			}
		} finally {
			await ephemeral.destroy();
		}
	});

	test("a regra de sucesso sai inteira para uma tarefa com composição `all`", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const response = await getProtocol(repositories);
			if (!response)
				throw new Error("protocolo deveria estar ativo por padrão");

			const allModeTask = response.tasks.find((task) => task.code === "T3");
			expect(allModeTask).toBeDefined();
			expect(allModeTask?.success.mode).toBe("all");
			expect(allModeTask?.success.signals.length).toBeGreaterThan(1);
			for (const signal of allModeTask?.success.signals ?? []) {
				expect(signal.kind).toBe("api");
			}
		} finally {
			await ephemeral.destroy();
		}
	});

	test("a regra de sucesso sai inteira para uma tarefa com casamento por parâmetro de busca", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const response = await getProtocol(repositories);
			if (!response)
				throw new Error("protocolo deveria estar ativo por padrão");

			const queryMatchTask = response.tasks.find((task) => task.code === "T9");
			expect(queryMatchTask).toBeDefined();
			expect(queryMatchTask?.success.mode).toBe("any");
			const [signal] = queryMatchTask?.success.signals ?? [];
			expect(signal?.kind).toBe("api");
			if (signal?.kind === "api") {
				expect(signal.query).toEqual({ category: true });
			}
		} finally {
			await ephemeral.destroy();
		}
	});

	test("perguntas condicionais trazem `depends_on` intacto", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const response = await getProtocol(repositories);
			if (!response)
				throw new Error("protocolo deveria estar ativo por padrão");

			const dependent = response.questions.find(
				(question) => question.key === "error_recovery",
			);
			expect(dependent?.depends_on).toEqual({
				question_key: "error_occurred",
				equals: "YES",
			});
		} finally {
			await ephemeral.destroy();
		}
	});

	test("devolve null quando nenhuma versão da key está ativa", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			await ephemeral.db
				.update(protocolVersions)
				.set({ isActive: false })
				.where(eq(protocolVersions.key, protocol.key));

			const response = await getProtocol(repositories, protocol.key);

			expect(response).toBeNull();
		} finally {
			await ephemeral.destroy();
		}
	});
});
