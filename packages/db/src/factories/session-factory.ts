import { randomUUID } from "node:crypto";

import { faker } from "@faker-js/faker";
import { ulid } from "ulid";

import type { HttpMethod, Option, PersonaKey } from "../protocol/types";
import type {
	ageRanges,
	answers,
	chainRoles,
	educationLevels,
	events,
	sessionStatuses,
	sessions,
	suiteRuns,
	taskRuns,
} from "../schema";
import { screenSizes } from "../schema";
import type {
	SeededProtocol,
	SeededQuestion,
	SeededTask,
} from "./resolve-seeded-protocol";

export type SessionInsert = typeof sessions.$inferInsert;
export type SuiteRunInsert = typeof suiteRuns.$inferInsert;
export type TaskRunInsert = typeof taskRuns.$inferInsert;
export type EventInsert = typeof events.$inferInsert;
export type AnswerInsert = typeof answers.$inferInsert;

type SessionStatus = (typeof sessionStatuses)[number];

export interface FactorySession {
	session: SessionInsert;
	suiteRuns: SuiteRunInsert[];
	taskRuns: TaskRunInsert[];
	events: EventInsert[];
	answers: AnswerInsert[];
}

export interface FactorySessionOptions {
	personaKey?: PersonaKey;
	status?: Exclude<SessionStatus, "DISCARDED">;
	/** Probabilidade [0,1] de cada sinal individual de uma SuccessRule "disparar". */
	signalDetectionRate?: number;
	startedAt?: Date;
}

const BRAZILIAN_LOCATIONS = [
	{ uf: "SP", city: "São Paulo" },
	{ uf: "RJ", city: "Rio de Janeiro" },
	{ uf: "MG", city: "Belo Horizonte" },
	{ uf: "BA", city: "Salvador" },
	{ uf: "PR", city: "Curitiba" },
	{ uf: "RS", city: "Porto Alegre" },
	{ uf: "PE", city: "Recife" },
	{ uf: "CE", city: "Fortaleza" },
	{ uf: "PA", city: "Belém" },
	{ uf: "SC", city: "Florianópolis" },
];

function pickOption(options: Option[] | undefined): Option {
	if (!options || options.length === 0) {
		throw new Error("Pergunta sem opções onde uma opção era esperada.");
	}
	return faker.helpers.arrayElement(options);
}

function findQuestion(
	questions: SeededQuestion[],
	key: string,
): SeededQuestion {
	const question = questions.find((q) => q.key === key);
	if (!question)
		throw new Error(`Pergunta "${key}" não encontrada no protocolo semeado.`);
	return question;
}

function weightedStatus(): Exclude<SessionStatus, "DISCARDED"> {
	return faker.helpers.weightedArrayElement([
		{ value: "COMPLETED", weight: 7 },
		{ value: "ABANDONED", weight: 2 },
		{ value: "IN_PROGRESS", weight: 1 },
	]);
}

interface SimulatedOutcome {
	outcome: "YES" | "PARTIAL" | "NO";
	autoDetected: boolean;
	firedSignals: SeededTask["successRule"]["signals"];
}

function simulateSignals(
	task: SeededTask,
	detectionRate: number,
): SimulatedOutcome {
	const firedSignals = task.successRule.signals.filter(() =>
		faker.datatype.boolean({ probability: detectionRate }),
	);

	const outcome: SimulatedOutcome["outcome"] =
		task.successRule.mode === "any"
			? firedSignals.length > 0
				? "YES"
				: "NO"
			: firedSignals.length === task.successRule.signals.length
				? "YES"
				: firedSignals.length > 0
					? "PARTIAL"
					: "NO";

	return { outcome, autoDetected: firedSignals.length > 0, firedSignals };
}

function eventPayloadFor(
	signal: SimulatedOutcome["firedSignals"][number],
): Record<string, unknown> {
	if (signal.kind === "api") {
		const method: HttpMethod = signal.method;
		return { method, path: signal.path_pattern, status: signal.status };
	}
	if (signal.kind === "screen") {
		return { route: signal.route };
	}
	return { name: signal.name, ...signal.payload };
}

function eventTypeFor(signal: SimulatedOutcome["firedSignals"][number]) {
	if (signal.kind === "api") return "api.call";
	if (signal.kind === "screen") return "screen.enter";
	return "ui.event";
}

/**
 * Gera, em memória, uma sessão completa e coerente: roteiro da persona respeitado,
 * outcome de cada tarefa derivado de sinais simulados, eventos correlacionados aos
 * sinais que "dispararam", e respostas de fim de etapa respeitando `depends_on`.
 * Não toca o banco — use `insertFactorySession` para gravar o resultado.
 */
export function buildFactorySession(
	seeded: SeededProtocol,
	options: FactorySessionOptions = {},
): FactorySession {
	const persona = options.personaKey
		? seeded.personas.find((p) => p.key === options.personaKey)
		: faker.helpers.arrayElement(seeded.personas);
	if (!persona) {
		throw new Error(
			`Persona "${options.personaKey}" não encontrada no protocolo semeado.`,
		);
	}

	const status = options.status ?? weightedStatus();
	const signalDetectionRate = options.signalDetectionRate ?? 0.75;

	const sessionId = randomUUID();
	const suiteRunRows: SuiteRunInsert[] = [];
	const taskRunRows: TaskRunInsert[] = [];
	const eventRows: EventInsert[] = [];
	const answerRows: AnswerInsert[] = [];

	let seq = 0;
	let cursor = options.startedAt ?? faker.date.recent({ days: 45 });
	const sessionStartedAt = cursor;

	const totalSuites = persona.suites.length;
	const suiteCount =
		status === "COMPLETED"
			? totalSuites
			: faker.number.int({ min: 1, max: totalSuites });
	const engagedSuites = persona.suites.slice(0, suiteCount);

	const perSuiteQuestions = seeded.questions
		.filter((q) => q.scope === "PER_SUITE")
		.sort((a, b) => a.position - b.position);

	let sessionActiveMs = 0;

	for (const [suiteIndex, suite] of engagedSuites.entries()) {
		const isLastEngagedSuite = suiteIndex === engagedSuites.length - 1;
		const suiteIsPartial = status !== "COMPLETED" && isLastEngagedSuite;

		const suiteRunId = randomUUID();
		const suiteStartedAt = cursor;

		const taskCount = suiteIsPartial
			? faker.number.int({ min: 1, max: suite.tasks.length })
			: suite.tasks.length;
		const tasksToRun = suite.tasks.slice(0, taskCount);

		let suiteActiveMs = 0;

		for (const [taskIndex, task] of tasksToRun.entries()) {
			const isLastTaskAttempted =
				suiteIsPartial && taskIndex === tasksToRun.length - 1;

			const taskStartedAt = cursor;
			const activeMs = faker.number.int({ min: 8_000, max: 90_000 });
			const { outcome, autoDetected, firedSignals } = simulateSignals(
				task,
				signalDetectionRate,
			);

			cursor = new Date(cursor.getTime() + activeMs);
			const taskFinishedAt = isLastTaskAttempted ? undefined : cursor;
			cursor = new Date(
				cursor.getTime() + faker.number.int({ min: 0, max: 20_000 }),
			);

			taskRunRows.push({
				id: randomUUID(),
				suiteRunId,
				taskId: task.id,
				position: taskIndex,
				startedAt: taskStartedAt,
				finishedAt: taskFinishedAt,
				activeMs,
				outcome,
				autoDetected,
			});
			suiteActiveMs += activeMs;

			for (const signal of firedSignals) {
				const occurredAt = new Date(
					taskStartedAt.getTime() + faker.number.int({ min: 0, max: activeMs }),
				);
				eventRows.push({
					id: randomUUID(),
					sessionId,
					clientEventId: randomUUID(),
					seq: seq++,
					type: eventTypeFor(signal),
					suiteCode: suite.code,
					taskCode: task.code,
					occurredAt,
					receivedAt: new Date(
						occurredAt.getTime() + faker.number.int({ min: 200, max: 4_000 }),
					),
					payload: eventPayloadFor(signal),
				});
			}
		}

		const suiteFinishedAt = suiteIsPartial ? undefined : cursor;
		suiteRunRows.push({
			id: suiteRunId,
			sessionId,
			suiteId: suite.id,
			position: suiteIndex,
			startedAt: suiteStartedAt,
			finishedAt: suiteFinishedAt,
			activeMs: suiteActiveMs,
			wallMs: cursor.getTime() - suiteStartedAt.getTime(),
			outcome: suiteIsPartial
				? undefined
				: aggregateOutcome(taskRunRows, suiteRunId),
		});
		sessionActiveMs += suiteActiveMs;

		if (!suiteIsPartial) {
			answerRows.push(
				...buildPerSuiteAnswers(perSuiteQuestions, sessionId, suiteRunId),
			);
		}
	}

	if (status === "COMPLETED") {
		const finalQuestion = seeded.questions.find((q) => q.scope === "FINAL");
		if (finalQuestion && faker.datatype.boolean({ probability: 0.5 })) {
			answerRows.push({
				id: randomUUID(),
				sessionId,
				suiteRunId: undefined,
				questionId: finalQuestion.id,
				valueText: faker.lorem
					.sentence()
					.slice(0, finalQuestion.maxLength ?? 4000),
			});
		}
	}

	const location = faker.helpers.arrayElement(BRAZILIAN_LOCATIONS);
	const session: SessionInsert = {
		id: sessionId,
		protocolVersionId: seeded.protocolVersionId,
		participantCode: ulid(),
		persona: persona.key,
		status,
		stateUf: location.uf,
		cityName: location.city,
		ageRange: pickOption(findQuestion(seeded.questions, "age_range").options)
			.key as (typeof ageRanges)[number],
		educationLevel: pickOption(
			findQuestion(seeded.questions, "education_level").options,
		).key as (typeof educationLevels)[number],
		chainRole: pickOption(findQuestion(seeded.questions, "chain_role").options)
			.key as (typeof chainRoles)[number],
		wasteContactFrequency: pickOption(
			findQuestion(seeded.questions, "waste_contact_frequency").options,
		).value,
		appExperience: pickOption(
			findQuestion(seeded.questions, "app_experience").options,
		).value,
		consentVersion: "v1",
		consentAt: sessionStartedAt,
		deviceOs: faker.helpers.arrayElement(["android", "ios"]),
		deviceOsVersion: faker.system.semver(),
		appVersion: faker.system.semver(),
		screenSize: faker.helpers.arrayElement(
			screenSizes,
		) as (typeof screenSizes)[number],
		startedAt: sessionStartedAt,
		finishedAt: status === "IN_PROGRESS" ? undefined : cursor,
		activeMs: sessionActiveMs,
		wallMs: cursor.getTime() - sessionStartedAt.getTime(),
		abandonReason: status === "ABANDONED" ? faker.lorem.sentence() : undefined,
	};

	return {
		session,
		suiteRuns: suiteRunRows,
		taskRuns: taskRunRows,
		events: eventRows,
		answers: answerRows,
	};
}

function aggregateOutcome(
	taskRunRows: TaskRunInsert[],
	suiteRunId: string,
): "YES" | "PARTIAL" | "NO" {
	const outcomes = taskRunRows
		.filter((run) => run.suiteRunId === suiteRunId)
		.map((run) => run.outcome);
	if (outcomes.every((o) => o === "YES")) return "YES";
	if (outcomes.every((o) => o === "NO")) return "NO";
	return "PARTIAL";
}

function buildPerSuiteAnswers(
	perSuiteQuestions: SeededQuestion[],
	sessionId: string,
	suiteRunId: string,
): AnswerInsert[] {
	const rows: AnswerInsert[] = [];
	const pickedKeyByQuestionKey = new Map<string, string>();

	for (const question of perSuiteQuestions) {
		if (question.dependsOn) {
			const controllerAnswer = pickedKeyByQuestionKey.get(
				question.dependsOn.question_key,
			);
			if (controllerAnswer !== question.dependsOn.equals) continue;
		}

		const row: AnswerInsert = {
			id: randomUUID(),
			sessionId,
			suiteRunId,
			questionId: question.id,
		};

		if (question.type === "SCALE") {
			const option = pickOption(question.options);
			row.valueNumber = option.value;
			pickedKeyByQuestionKey.set(question.key, option.key);
		} else if (question.type === "CHOICE") {
			const option = pickOption(question.options);
			row.valueText = option.key;
			pickedKeyByQuestionKey.set(question.key, option.key);
		} else {
			row.valueText = faker.lorem
				.sentence()
				.slice(0, question.maxLength ?? 4000);
		}

		rows.push(row);
	}

	return rows;
}
