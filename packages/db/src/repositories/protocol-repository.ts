import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

import type {
	Option,
	QuestionDependency,
	SuccessRule,
} from "../protocol/types";
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

export interface ActiveProtocolVersionRow {
	id: string;
	key: string;
	version: number;
}

export interface ProtocolVersionListRow {
	id: string;
	key: string;
	version: number;
	publishedAt: Date;
	isActive: boolean;
}

export interface ProtocolPersonaSuiteRow {
	suiteCode: string;
	specificObjectives: string[];
}

export interface ProtocolPersonaRow {
	key: string;
	label: string;
	description: string;
	suites: ProtocolPersonaSuiteRow[];
}

export interface ProtocolSuiteRow {
	code: string;
	title: string;
	objective: string;
	taskCodes: string[];
}

export interface ProtocolTaskRow {
	code: string;
	title: string;
	instruction: string;
	successRule: SuccessRule;
}

export interface ProtocolQuestionRow {
	key: string;
	scope: string;
	type: string;
	position: number;
	label: string;
	helperText: string | null;
	infoText: string | null;
	required: boolean;
	options: Option[] | null;
	maxLength: number | null;
	dependsOn: QuestionDependency | null;
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
	 * Resolve o id da versão de protocolo mais recente publicada sob `key`, ignorando
	 * `is_active` — usada pelas métricas do dashboard, onde uma versão desativada para
	 * novos participantes ainda precisa aparecer nos dados já coletados. Toda consulta
	 * de métrica escopa por esse id — sessões de versões antigas do instrumento não
	 * entram no mesmo cálculo que sessões da versão vigente, mesmo com texto de
	 * pergunta parecido, porque `questions.id` (usado pra juntar respostas) muda a cada
	 * versão publicada.
	 */
	async getLatestProtocolVersionId(key = "oikos-walkthrough"): Promise<string> {
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

	/**
	 * Igual a `getLatestProtocolVersionId`, mas devolve `key`/`version` junto do id e
	 * respeita `is_active` — usado pelo endpoint E1 (`usability.protocol`), o único
	 * caminho que o app consome. Devolve `null` quando existem versões para `key` mas
	 * nenhuma está ativa (desligado de propósito); só lança quando não existe nenhuma
	 * linha pra `key` (seed ausente).
	 */
	async getActiveProtocolVersion(
		key = "oikos-walkthrough",
	): Promise<ActiveProtocolVersionRow | null> {
		const [row] = await this.db
			.select({
				id: protocolVersions.id,
				key: protocolVersions.key,
				version: protocolVersions.version,
			})
			.from(protocolVersions)
			.where(
				and(eq(protocolVersions.key, key), eq(protocolVersions.isActive, true)),
			)
			.orderBy(desc(protocolVersions.version))
			.limit(1);
		if (row) return row;

		const [anyRow] = await this.db
			.select({ id: protocolVersions.id })
			.from(protocolVersions)
			.where(eq(protocolVersions.key, key))
			.limit(1);
		if (!anyRow) {
			throw new Error(
				`Protocolo "${key}" não está semeado — rode "bun run db:seed".`,
			);
		}
		return null;
	}

	/**
	 * Resolve `(key, version)` exatos para o id da versão — ao contrário de
	 * `getActiveProtocolVersion`, não pega a mais recente: E2 fixa a versão que a
	 * sessão executou (A2), então uma sessão aberta contra uma versão antiga ainda
	 * publicada precisa continuar resolvendo para ela. Devolve `undefined`, não lança,
	 * porque "versão inexistente" é erro de validação de entrada, não falha de seed.
	 */
	async getProtocolVersionId(
		key: string,
		version: number,
	): Promise<string | undefined> {
		const [row] = await this.db
			.select({ id: protocolVersions.id })
			.from(protocolVersions)
			.where(
				and(
					eq(protocolVersions.key, key),
					eq(protocolVersions.version, version),
				),
			);
		return row?.id;
	}

	/**
	 * Resolve o id da versão para `key`/`version`. Devolve `undefined` em vez de lançar:
	 * o painel navega por versões arbitrárias vindas da URL, então id inexistente é
	 * entrada inválida, não falha de seed.
	 */
	async findProtocolVersionById(
		id: string,
	): Promise<ActiveProtocolVersionRow | undefined> {
		const [row] = await this.db
			.select({
				id: protocolVersions.id,
				key: protocolVersions.key,
				version: protocolVersions.version,
			})
			.from(protocolVersions)
			.where(eq(protocolVersions.id, id))
			.limit(1);
		return row;
	}

	/** Personas do protocolo com os códigos de suíte (não os ids) — forma do contrato E1. */
	async getProtocolPersonas(
		protocolVersionId: string,
	): Promise<ProtocolPersonaRow[]> {
		const personas = await this.db
			.select({
				id: personaDefs.id,
				key: personaDefs.key,
				label: personaDefs.label,
				description: personaDefs.description,
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
							suiteCode: suiteDefs.code,
							specificObjectives: personaSuites.specificObjectives,
						})
						.from(personaSuites)
						.innerJoin(suiteDefs, eq(personaSuites.suiteId, suiteDefs.id))
						.where(inArray(personaSuites.personaId, personaIds))
						.orderBy(personaSuites.position);

		const suitesByPersonaId = new Map<string, ProtocolPersonaSuiteRow[]>();
		for (const link of links) {
			const list = suitesByPersonaId.get(link.personaId) ?? [];
			list.push({
				suiteCode: link.suiteCode,
				specificObjectives: link.specificObjectives,
			});
			suitesByPersonaId.set(link.personaId, list);
		}

		return personas.map((persona) => ({
			key: persona.key,
			label: persona.label,
			description: persona.description,
			suites: suitesByPersonaId.get(persona.id) ?? [],
		}));
	}

	/** Suítes do protocolo com objetivo e códigos de tarefa (não os ids) — forma do contrato E1. */
	async getProtocolSuites(
		protocolVersionId: string,
	): Promise<ProtocolSuiteRow[]> {
		const suites = await this.db
			.select({
				id: suiteDefs.id,
				code: suiteDefs.code,
				title: suiteDefs.title,
				objective: suiteDefs.objective,
			})
			.from(suiteDefs)
			.where(eq(suiteDefs.protocolVersionId, protocolVersionId));

		const suiteIds = suites.map((suite) => suite.id);
		const tasks =
			suiteIds.length === 0
				? []
				: await this.db
						.select({ suiteId: taskDefs.suiteId, code: taskDefs.code })
						.from(taskDefs)
						.where(inArray(taskDefs.suiteId, suiteIds))
						.orderBy(taskDefs.position);

		const taskCodesBySuiteId = new Map<string, string[]>();
		for (const task of tasks) {
			const list = taskCodesBySuiteId.get(task.suiteId) ?? [];
			list.push(task.code);
			taskCodesBySuiteId.set(task.suiteId, list);
		}

		return suites.map((suite) => ({
			code: suite.code,
			title: suite.title,
			objective: suite.objective,
			taskCodes: taskCodesBySuiteId.get(suite.id) ?? [],
		}));
	}

	/**
	 * Tarefas do protocolo com a regra de sucesso inteira — forma do contrato E1.
	 *
	 * O seed grava uma linha de `task_defs` por par (suíte, tarefa) — uma mesma tarefa
	 * referenciada por duas suítes (ex.: T8 em S1 e S6) vira duas linhas, com o mesmo
	 * conteúdo (`seed.ts`). O contrato E1 quer as tarefas únicas, uma vez cada, e as
	 * suítes se referem a elas por código (`suites[].task_codes`) — daí o `Map` por
	 * código: mantém só a primeira ocorrência, cujo conteúdo é idêntico às demais.
	 */
	async getProtocolTasks(
		protocolVersionId: string,
	): Promise<ProtocolTaskRow[]> {
		const rows = await this.db
			.select({
				code: taskDefs.code,
				title: taskDefs.title,
				instruction: taskDefs.instruction,
				successRule: taskDefs.successRule,
			})
			.from(taskDefs)
			.innerJoin(suiteDefs, eq(taskDefs.suiteId, suiteDefs.id))
			.where(eq(suiteDefs.protocolVersionId, protocolVersionId));

		const uniqueByCode = new Map<string, ProtocolTaskRow>();
		for (const row of rows) {
			if (!uniqueByCode.has(row.code)) uniqueByCode.set(row.code, row);
		}
		return [...uniqueByCode.values()];
	}

	/** Todas as perguntas do protocolo, na forma completa do contrato E1. */
	async getProtocolQuestions(
		protocolVersionId: string,
	): Promise<ProtocolQuestionRow[]> {
		const rows = await this.db
			.select({
				key: questions.key,
				scope: questions.scope,
				type: questions.type,
				position: questions.position,
				label: questions.label,
				helperText: questions.helperText,
				infoText: questions.infoText,
				required: questions.required,
				options: questions.options,
				maxLength: questions.maxLength,
				dependsOn: questions.dependsOn,
			})
			.from(questions)
			.where(eq(questions.protocolVersionId, protocolVersionId))
			.orderBy(questions.position);

		return rows.map((row) => ({
			...row,
			helperText: row.helperText ?? null,
			infoText: row.infoText ?? null,
			options: row.options ?? null,
			maxLength: row.maxLength ?? null,
			dependsOn: row.dependsOn ?? null,
		}));
	}

	/** Todas as versões de todas as `key`s, para a tela de administração do painel. */
	async listProtocolVersions(): Promise<ProtocolVersionListRow[]> {
		return this.db
			.select({
				id: protocolVersions.id,
				key: protocolVersions.key,
				version: protocolVersions.version,
				publishedAt: protocolVersions.publishedAt,
				isActive: protocolVersions.isActive,
			})
			.from(protocolVersions)
			.orderBy(protocolVersions.key, desc(protocolVersions.version));
	}

	/**
	 * Liga/desliga uma versão para novos participantes (E1). Ativar uma versão desativa
	 * as irmãs da mesma `key` na mesma transação — só uma versão ativa por `key` de cada
	 * vez. Desativar não exige ativar outra: é o "desligar tudo" para aquela `key`.
	 *
	 * Só a última versão da `key` pode ser ativada: publicar substitui, não coexiste.
	 * Reativar uma versão antiga entregaria a participantes novos um instrumento que já
	 * foi corrigido, e os códigos de tarefa mudam entre versões — a comparação entre
	 * sessões deixaria de fazer sentido. Desativar continua valendo para qualquer uma,
	 * porque é o caminho do kill switch.
	 */
	async setProtocolVersionActive(id: string, isActive: boolean): Promise<void> {
		await this.db.transaction(async (tx) => {
			const [target] = await tx
				.select({
					key: protocolVersions.key,
					version: protocolVersions.version,
				})
				.from(protocolVersions)
				.where(eq(protocolVersions.id, id));
			if (!target) {
				throw new Error(`Versão de protocolo "${id}" não encontrada.`);
			}

			if (isActive) {
				const [latest] = await tx
					.select({ version: protocolVersions.version })
					.from(protocolVersions)
					.where(eq(protocolVersions.key, target.key))
					.orderBy(desc(protocolVersions.version))
					.limit(1);

				if (latest && latest.version > target.version) {
					throw new Error(
						`Só a última versão de "${target.key}" pode ser ativada — a v${target.version} foi substituída pela v${latest.version}.`,
					);
				}

				await tx
					.update(protocolVersions)
					.set({ isActive: false })
					.where(eq(protocolVersions.key, target.key));
			}

			await tx
				.update(protocolVersions)
				.set({ isActive })
				.where(eq(protocolVersions.id, id));
		});
	}

	/** Id da suíte pelo código, dentro de uma versão — usado por E3 para resolver `suite.code`. */
	async findSuiteIdByCode(
		protocolVersionId: string,
		code: string,
	): Promise<string | undefined> {
		const [row] = await this.db
			.select({ id: suiteDefs.id })
			.from(suiteDefs)
			.where(
				and(
					eq(suiteDefs.protocolVersionId, protocolVersionId),
					eq(suiteDefs.code, code),
				),
			);
		return row?.id;
	}

	/** Ids das tarefas informadas, pelo código, dentro de uma suíte — usado por E3. */
	async findTaskIdsByCodes(
		suiteId: string,
		codes: string[],
	): Promise<Map<string, string>> {
		if (codes.length === 0) return new Map();
		const rows = await this.db
			.select({ id: taskDefs.id, code: taskDefs.code })
			.from(taskDefs)
			.where(and(eq(taskDefs.suiteId, suiteId), inArray(taskDefs.code, codes)));
		return new Map(rows.map((row) => [row.code, row.id]));
	}

	/** Ids das perguntas informadas, pela chave — usado por E3/E4 para resolver `question_key`. */
	async findQuestionIdsByKeys(
		protocolVersionId: string,
		keys: string[],
	): Promise<Map<string, string>> {
		if (keys.length === 0) return new Map();
		const rows = await this.db
			.select({ id: questions.id, key: questions.key })
			.from(questions)
			.where(
				and(
					eq(questions.protocolVersionId, protocolVersionId),
					inArray(questions.key, keys),
				),
			);
		return new Map(rows.map((row) => [row.key, row.id]));
	}
}
