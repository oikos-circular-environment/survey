/**
 * Tabelas de protocolo — o instrumento materializado.
 *
 * São escritas só pelo seed, que lê o arquivo de protocolo, e lidas em runtime pelo
 * endpoint que serve a versão vigente. O arquivo é a fonte da verdade; estas tabelas
 * são de onde sai a chave estrangeira de verdade, para que uma sessão fique presa à
 * versão exata que ela executou.
 *
 * Publicar uma versão nova cria linhas novas. Nada aqui é atualizado no lugar.
 *
 * As chaves estrangeiras são nomeadas à mão. O nome que o Drizzle monta sozinho junta
 * tabela, coluna, tabela referenciada e coluna referenciada, e com o prefixo
 * `usability_` isso estoura os 64 caracteres que o MySQL aceita num identificador. O
 * nome curto também aparece melhor na mensagem de erro de uma violação.
 */

import {
	boolean,
	char,
	foreignKey,
	int,
	json,
	mysqlEnum,
	mysqlTable,
	primaryKey,
	uniqueIndex,
	varchar,
} from "drizzle-orm/mysql-core";

import type { ChoiceOption, ScaleOption, SuccessRule } from "../protocol/types";
import { nowMs, timestampMs } from "./columns";
import {
	personaKeys,
	polarities,
	questionScopes,
	questionTypes,
} from "./enums";

export const protocolVersions = mysqlTable(
	"usability_protocol_versions",
	{
		id: char("id", { length: 36 }).primaryKey(),
		key: varchar("key", { length: 64 }).notNull(), // "oikos-walkthrough"
		version: int("version").notNull(),
		publishedAt: timestampMs("published_at").notNull().default(nowMs()),
	},
	(t) => [uniqueIndex("protocol_versions_key_version").on(t.key, t.version)],
);

/**
 * A persona não carrega perguntas próprias: existe um único conjunto de perguntas,
 * idêntico para todas. Ela é só o mapeamento para as suítes que serão executadas.
 */
export const personaDefs = mysqlTable(
	"usability_persona_defs",
	{
		id: char("id", { length: 36 }).primaryKey(),
		protocolVersionId: char("protocol_version_id", { length: 36 }).notNull(),
		key: mysqlEnum("key", personaKeys).notNull(),
		label: varchar("label", { length: 128 }).notNull(),
		description: varchar("description", { length: 512 }).notNull(),
		position: int("position").notNull(),
	},
	(t) => [
		uniqueIndex("persona_defs_version_key").on(t.protocolVersionId, t.key),
		foreignKey({
			name: "fk_persona_defs_version",
			columns: [t.protocolVersionId],
			foreignColumns: [protocolVersions.id],
		}).onDelete("cascade"),
	],
);

export const suiteDefs = mysqlTable(
	"usability_suite_defs",
	{
		id: char("id", { length: 36 }).primaryKey(),
		protocolVersionId: char("protocol_version_id", { length: 36 }).notNull(),
		code: varchar("code", { length: 8 }).notNull(), // "S1".."S6"
		title: varchar("title", { length: 128 }).notNull(),
		objective: varchar("objective", { length: 512 }).notNull(),
	},
	(t) => [
		uniqueIndex("suite_defs_version_code").on(t.protocolVersionId, t.code),
		foreignKey({
			name: "fk_suite_defs_version",
			columns: [t.protocolVersionId],
			foreignColumns: [protocolVersions.id],
		}).onDelete("cascade"),
	],
);

export const personaSuites = mysqlTable(
	"usability_persona_suites",
	{
		personaId: char("persona_id", { length: 36 }).notNull(),
		suiteId: char("suite_id", { length: 36 }).notNull(),
		position: int("position").notNull(), // ordem de execução para aquela persona
	},
	(t) => [
		primaryKey({ columns: [t.personaId, t.suiteId] }),
		foreignKey({
			name: "fk_persona_suites_persona",
			columns: [t.personaId],
			foreignColumns: [personaDefs.id],
		}).onDelete("cascade"),
		foreignKey({
			name: "fk_persona_suites_suite",
			columns: [t.suiteId],
			foreignColumns: [suiteDefs.id],
		}).onDelete("cascade"),
	],
);

export const taskDefs = mysqlTable(
	"usability_task_defs",
	{
		id: char("id", { length: 36 }).primaryKey(),
		suiteId: char("suite_id", { length: 36 }).notNull(),
		code: varchar("code", { length: 8 }).notNull(), // "T1".."T17"
		title: varchar("title", { length: 128 }).notNull(),
		instruction: varchar("instruction", { length: 512 }).notNull(),
		position: int("position").notNull(),
		/**
		 * Regra de detecção automática, serializada como veio do protocolo.
		 *
		 * É coluna JSON e não três colunas porque a árvore tem casamento por parâmetro
		 * de busca, sinal por chegada de tela e composição `all` de vários sinais.
		 * Achatar isso exigiria tabela filha e remontagem a cada leitura, para um dado
		 * que nunca é consultado por partes: sai inteiro no endpoint e é avaliado
		 * inteiro pelo aplicativo.
		 */
		successRule: json("success_rule").$type<SuccessRule>().notNull(),
	},
	(t) => [
		uniqueIndex("task_defs_suite_code").on(t.suiteId, t.code),
		foreignKey({
			name: "fk_task_defs_suite",
			columns: [t.suiteId],
			foreignColumns: [suiteDefs.id],
		}).onDelete("cascade"),
	],
);

export const questions = mysqlTable(
	"usability_questions",
	{
		id: char("id", { length: 36 }).primaryKey(),
		protocolVersionId: char("protocol_version_id", { length: 36 }).notNull(),
		key: varchar("key", { length: 64 }).notNull(), // "age_range" | "satisfaction" | "sus_1"
		scope: mysqlEnum("scope", questionScopes).notNull(),
		type: mysqlEnum("type", questionTypes).notNull(),
		position: int("position").notNull(),
		label: varchar("label", { length: 512 }).notNull(),
		helperText: varchar("helper_text", { length: 512 }),
		required: boolean("required").notNull().default(true),
		// opções — a pergunta carrega as próprias, não referencia escala externa
		options: json("options").$type<ScaleOption[] | ChoiceOption[]>(),
		anchorMin: varchar("anchor_min", { length: 128 }),
		anchorMax: varchar("anchor_max", { length: 128 }),
		repeatAnchors: boolean("repeat_anchors").notNull().default(false),
		maxLength: int("max_length"), // apenas TEXT
		polarity: mysqlEnum("polarity", polarities), // apenas itens do questionário final
	},
	(t) => [
		uniqueIndex("questions_version_key").on(t.protocolVersionId, t.key),
		foreignKey({
			name: "fk_questions_version",
			columns: [t.protocolVersionId],
			foreignColumns: [protocolVersions.id],
		}).onDelete("cascade"),
	],
);
