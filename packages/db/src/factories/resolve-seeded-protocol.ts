import { and, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import type {
	Option,
	PersonaKey,
	QuestionDependency,
	QuestionScope,
	SuccessRule,
	SuiteCode,
	TaskCode,
} from "../protocol/types";
import type * as schema from "../schema";
import {
	personaDefs,
	personaSuites,
	protocolVersions,
	questions,
	suiteDefs,
	taskDefs,
} from "../schema";

type Db = MySql2Database<typeof schema>;

export interface SeededTask {
	id: string;
	code: TaskCode;
	successRule: SuccessRule;
}

export interface SeededSuite {
	id: string;
	code: SuiteCode;
	tasks: SeededTask[];
}

export interface SeededPersona {
	id: string;
	key: PersonaKey;
	suites: SeededSuite[];
}

export interface SeededQuestion {
	id: string;
	key: string;
	scope: QuestionScope;
	type: "SCALE" | "CHOICE" | "TEXT";
	/** Ordem dentro do próprio `scope` — não é única entre escopos diferentes. */
	position: number;
	options?: Option[];
	maxLength?: number;
	dependsOn?: QuestionDependency;
}

export interface SeededProtocol {
	protocolVersionId: string;
	personas: SeededPersona[];
	questions: SeededQuestion[];
}

/**
 * Lê um protocolo já materializado pelo seed (`../seed/seed.ts`) e monta a árvore
 * persona → suítes → tarefas com os IDs reais do banco, para que as factories não
 * precisem adivinhar nada — só referenciar o que já existe.
 */
export async function resolveSeededProtocol(
	db: Db,
	key: string,
	version: number,
): Promise<SeededProtocol> {
	const [versionRow] = await db
		.select({ id: protocolVersions.id })
		.from(protocolVersions)
		.where(
			and(eq(protocolVersions.key, key), eq(protocolVersions.version, version)),
		);

	if (!versionRow) {
		throw new Error(
			`Protocolo "${key}" versão ${version} não está semeado — rode "bun run db:seed" primeiro.`,
		);
	}
	const protocolVersionId = versionRow.id;

	const personaRows = await db
		.select()
		.from(personaDefs)
		.where(eq(personaDefs.protocolVersionId, protocolVersionId))
		.orderBy(personaDefs.position);

	const suiteRows = await db
		.select()
		.from(suiteDefs)
		.where(eq(suiteDefs.protocolVersionId, protocolVersionId));

	const suiteIds = suiteRows.map((suite) => suite.id);
	const taskRows =
		suiteIds.length === 0
			? []
			: await db
					.select()
					.from(taskDefs)
					.where(inArray(taskDefs.suiteId, suiteIds))
					.orderBy(taskDefs.position);

	const personaIds = personaRows.map((persona) => persona.id);
	const personaSuiteRows =
		personaIds.length === 0
			? []
			: await db
					.select()
					.from(personaSuites)
					.where(inArray(personaSuites.personaId, personaIds))
					.orderBy(personaSuites.position);

	const questionRows = await db
		.select()
		.from(questions)
		.where(eq(questions.protocolVersionId, protocolVersionId))
		.orderBy(questions.position);

	const tasksBySuiteId = new Map<string, SeededTask[]>();
	for (const row of taskRows) {
		const list = tasksBySuiteId.get(row.suiteId) ?? [];
		list.push({
			id: row.id,
			code: row.code as TaskCode,
			successRule: row.successRule,
		});
		tasksBySuiteId.set(row.suiteId, list);
	}

	const suiteById = new Map(suiteRows.map((suite) => [suite.id, suite]));

	const suitesByPersonaId = new Map<string, SeededSuite[]>();
	for (const row of personaSuiteRows) {
		const suite = suiteById.get(row.suiteId);
		if (!suite) continue;

		const list = suitesByPersonaId.get(row.personaId) ?? [];
		list.push({
			id: suite.id,
			code: suite.code as SuiteCode,
			tasks: tasksBySuiteId.get(suite.id) ?? [],
		});
		suitesByPersonaId.set(row.personaId, list);
	}

	const personas: SeededPersona[] = personaRows.map((persona) => ({
		id: persona.id,
		key: persona.key,
		suites: suitesByPersonaId.get(persona.id) ?? [],
	}));

	const seededQuestions: SeededQuestion[] = questionRows.map((question) => ({
		id: question.id,
		key: question.key,
		scope: question.scope,
		type: question.type,
		position: question.position,
		options: question.options ?? undefined,
		maxLength: question.maxLength ?? undefined,
		dependsOn: question.dependsOn ?? undefined,
	}));

	return { protocolVersionId, personas, questions: seededQuestions };
}
