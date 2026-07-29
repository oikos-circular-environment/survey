import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import type { Option } from "../protocol/types";
import type * as schema from "../schema/index";
import {
	personaDefs,
	personaSuites,
	protocolVersions,
	questions,
	suiteDefs,
	taskDefs,
} from "../schema/protocol";

type Db = MySql2Database<typeof schema>;

export interface QuestionOptionsRow {
	key: string;
	options: Option[];
}

export interface SuiteDefRow {
	id: string;
	code: string;
	title: string;
	taskCount: number;
}

export interface TaskDefRow {
	id: string;
	code: string;
	title: string;
	suiteId: string;
	suiteCode: string;
}

export interface PersonaDefRow {
	id: string;
	key: string;
	label: string;
	suiteIds: string[];
}

/**
 * Acesso de leitura à definição do protocolo (versões, suítes, tarefas, personas).
 * Nada aqui calcula métrica — só resolve a árvore do instrumento com ids reais, o
 * mesmo papel que `factories/resolve-seeded-protocol.ts` cumpre para geração sintética,
 * aqui para leitura de dashboard.
 */
export class ProtocolRepository {
	constructor(private readonly db: Db) {}

	/**
	 * Resolve o id da versão de protocolo mais recente publicada sob `key`. Toda
	 * consulta de métrica escopa por esse id — sessões de versões antigas do
	 * instrumento não entram no mesmo cálculo que sessões da versão vigente, mesmo com
	 * texto de pergunta parecido, porque `questions.id` (usado pra juntar respostas)
	 * muda a cada versão publicada.
	 */
	async getActiveProtocolVersionId(key = "oikos-walkthrough"): Promise<string> {
		const [row] = await this.db
			.select({ id: protocolVersions.id })
			.from(protocolVersions)
			.where(eq(protocolVersions.key, key))
			.orderBy(desc(protocolVersions.version))
			.limit(1);
		if (!row) {
			throw new Error(
				`Protocolo "${key}" não está semeado — rode "bun run db:seed".`,
			);
		}
		return row.id;
	}

	/** Suítes do protocolo com a contagem de tarefas de cada uma. */
	async getSuiteDefs(protocolVersionId: string): Promise<SuiteDefRow[]> {
		const suites = await this.db
			.select({
				id: suiteDefs.id,
				code: suiteDefs.code,
				title: suiteDefs.title,
			})
			.from(suiteDefs)
			.where(eq(suiteDefs.protocolVersionId, protocolVersionId));

		const suiteIds = suites.map((suite) => suite.id);
		const counts =
			suiteIds.length === 0
				? []
				: await this.db
						.select({
							suiteId: taskDefs.suiteId,
							count: sql<number>`count(*)`.mapWith(Number),
						})
						.from(taskDefs)
						.where(inArray(taskDefs.suiteId, suiteIds))
						.groupBy(taskDefs.suiteId);

		const countBySuiteId = new Map(
			counts.map((row) => [row.suiteId, row.count]),
		);
		return suites.map((suite) => ({
			...suite,
			taskCount: countBySuiteId.get(suite.id) ?? 0,
		}));
	}

	/** Tarefas do protocolo com o código da suíte-mãe embutido (evita join no consumidor). */
	async getTaskDefs(protocolVersionId: string): Promise<TaskDefRow[]> {
		return this.db
			.select({
				id: taskDefs.id,
				code: taskDefs.code,
				title: taskDefs.title,
				suiteId: taskDefs.suiteId,
				suiteCode: suiteDefs.code,
			})
			.from(taskDefs)
			.innerJoin(suiteDefs, eq(taskDefs.suiteId, suiteDefs.id))
			.where(eq(suiteDefs.protocolVersionId, protocolVersionId));
	}

	/** Personas do protocolo com as suítes atribuídas a cada uma (via `personaSuites`). */
	async getPersonaDefs(protocolVersionId: string): Promise<PersonaDefRow[]> {
		const personas = await this.db
			.select({
				id: personaDefs.id,
				key: personaDefs.key,
				label: personaDefs.label,
			})
			.from(personaDefs)
			.where(eq(personaDefs.protocolVersionId, protocolVersionId))
			.orderBy(personaDefs.position);

		const personaIds = personas.map((persona) => persona.id);
		const links =
			personaIds.length === 0
				? []
				: await this.db
						.select({
							personaId: personaSuites.personaId,
							suiteId: personaSuites.suiteId,
						})
						.from(personaSuites)
						.where(inArray(personaSuites.personaId, personaIds));

		const suiteIdsByPersonaId = new Map<string, string[]>();
		for (const link of links) {
			const list = suiteIdsByPersonaId.get(link.personaId) ?? [];
			list.push(link.suiteId);
			suiteIdsByPersonaId.set(link.personaId, list);
		}

		return personas.map((persona) => ({
			...persona,
			suiteIds: suiteIdsByPersonaId.get(persona.id) ?? [],
		}));
	}

	/**
	 * Opções (`value`/`key`/`label`) das perguntas informadas, na mesma versão de
	 * protocolo. Usado pela Caracterização para traduzir enums do screener
	 * (`ageRange`, `educationLevel`, ...) em rótulos exibíveis sem duplicar o texto das
	 * opções em `packages/api` — o protocolo semeado é a única fonte desses rótulos.
	 */
	async getQuestionOptions(
		protocolVersionId: string,
		keys: string[],
	): Promise<QuestionOptionsRow[]> {
		if (keys.length === 0) return [];
		const rows = await this.db
			.select({ key: questions.key, options: questions.options })
			.from(questions)
			.where(
				and(
					eq(questions.protocolVersionId, protocolVersionId),
					inArray(questions.key, keys),
				),
			);
		return rows.map((row) => ({ key: row.key, options: row.options ?? [] }));
	}
}
