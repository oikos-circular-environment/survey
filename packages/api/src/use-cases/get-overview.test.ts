import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import type { UsabilityCheckpointInput } from "../routers/usability-schemas";
import { getOverview } from "./get-overview";
import { getPersonas } from "./get-personas";
import { sendUsabilityCheckpoint } from "./send-usability-checkpoint";
import { upsertUsabilitySession } from "./upsert-usability-session";
import {
	buildSessionUpsertInput,
	completeSession,
	setupUsabilityTest,
} from "./usability-test-helpers";

const RANGE = {
	from: Date.parse("2026-08-15T00:00:00.000Z"),
	to: Date.parse("2026-08-16T00:00:00.000Z"),
};

/** Suíte gravada como NO pelo app, embora uma das duas tarefas tenha sido concluída. */
function partialSuiteCheckpoint(
	sessionId: string,
	satisfaction: number | null,
): UsabilityCheckpointInput {
	return {
		session_id: sessionId,
		suite_run_id: randomUUID(),
		chunk: { index: 0, total: 1 },
		suite: {
			code: "S1",
			position: 0,
			started_at: new Date("2026-08-15T18:00:00.000Z"),
			finished_at: new Date("2026-08-15T18:05:00.000Z"),
			active_ms: 60_000,
			wall_ms: 300_000,
			outcome: "NO",
		},
		tasks: [
			{
				code: "T8",
				position: 0,
				started_at: new Date("2026-08-15T18:00:00.000Z"),
				finished_at: new Date("2026-08-15T18:01:00.000Z"),
				active_ms: 30_000,
				outcome: "YES",
				auto_detected: true,
			},
			{
				code: "T13",
				position: 1,
				started_at: new Date("2026-08-15T18:01:00.000Z"),
				finished_at: new Date("2026-08-15T18:02:00.000Z"),
				active_ms: 20_000,
				outcome: "NO",
				auto_detected: false,
			},
		],
		events: [],
		answers:
			satisfaction === null
				? []
				: [{ question_key: "satisfaction", value_number: satisfaction }],
	};
}

describe("getOverview, recorte e cálculo global", () => {
	test("métricas usam só sessões concluídas e a eficácia vem das tarefas, não do outcome da suíte", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const completed = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, completed);
			await sendUsabilityCheckpoint(
				repositories,
				partialSuiteCheckpoint(completed.session_id, 4),
			);
			await completeSession(repositories, completed.session_id);

			const open = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, open);
			await sendUsabilityCheckpoint(
				repositories,
				partialSuiteCheckpoint(open.session_id, 1),
			);

			const { stats } = await getOverview(repositories, RANGE);

			expect(stats.totalSessions).toBe(2);
			expect(stats.porStatus).toEqual({ COMPLETED: 1, IN_PROGRESS: 1 });
			expect(stats.sessoesConcluidas).toBe(1);
			expect(stats.tarefasRealizadas).toBe(2);
			expect(stats.tarefasConcluidas).toBe(1);
			expect(stats.eficacia).toBe(0.5);
			expect(stats.tempoMedioMs).toBe(30_000);
			expect(stats.satisfacaoMedia).toBe(4);
			expect(stats.satisfacao).toBe(0.75);
		} finally {
			await ephemeral.destroy();
		}
	});

	test("sem resposta de satisfação, Ts e Us ficam nulos em vez de zero", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await sendUsabilityCheckpoint(
				repositories,
				partialSuiteCheckpoint(session.session_id, null),
			);
			await completeSession(repositories, session.session_id);

			const { stats } = await getOverview(repositories, RANGE);

			expect(stats.eficacia).toBe(0.5);
			expect(stats.satisfacao).toBeNull();
			expect(stats.nivelDeUsabilidade).toBeNull();
			expect(stats.classificacao).toBeNull();
		} finally {
			await ephemeral.destroy();
		}
	});
});

describe("getPersonas, recorte por persona", () => {
	test("persona com tarefas parciais tem eficácia proporcional e persona sem sessões fica sem métrica", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput();
			await upsertUsabilitySession(repositories, session);
			await sendUsabilityCheckpoint(
				repositories,
				partialSuiteCheckpoint(session.session_id, 4),
			);
			await completeSession(repositories, session.session_id);

			const personas = await getPersonas(repositories, RANGE);
			const citizen = personas.find((p) => p.key === "CITIZEN");
			const collector = personas.find((p) => p.key === "COLLECTOR");
			if (!citizen || !collector)
				throw new Error("esperava CITIZEN e COLLECTOR");

			expect(citizen.participantes).toBe(1);
			expect(citizen.eficacia).toBe(0.5);
			expect(citizen.satisfacaoMedia).toBe(4);
			expect(citizen.nivelDeUsabilidade).not.toBeNull();

			expect(collector.participantes).toBe(0);
			expect(collector.eficacia).toBeNull();
			expect(collector.eficiencia).toBeNull();
			expect(collector.satisfacaoMedia).toBeNull();
			expect(collector.classificacao).toBeNull();
		} finally {
			await ephemeral.destroy();
		}
	});

	test("persona que realizou tarefas sem concluir nenhuma tem Tf = 0 e Us calculado", async () => {
		const { ephemeral, repositories } = await setupUsabilityTest();
		try {
			const session = buildSessionUpsertInput({ persona: "GOVERNMENT" });
			await upsertUsabilitySession(repositories, session);
			const checkpoint = partialSuiteCheckpoint(session.session_id, 5);
			checkpoint.tasks = checkpoint.tasks.map((task) => ({
				...task,
				outcome: "NO",
				auto_detected: false,
			}));
			await sendUsabilityCheckpoint(repositories, checkpoint);
			await completeSession(repositories, session.session_id);

			const personas = await getPersonas(repositories, RANGE);
			const government = personas.find((p) => p.key === "GOVERNMENT");
			if (!government) throw new Error("esperava GOVERNMENT");

			expect(government.eficacia).toBe(0);
			expect(government.eficiencia).toBe(0);
			expect(government.satisfacao).toBe(1);
			expect(government.nivelDeUsabilidade).toBeCloseTo(1 / 3);
			expect(government.classificacao).toBe("Satisfatório");
		} finally {
			await ephemeral.destroy();
		}
	});
});
