/**
 * Tabelas de coleta — o que é escrito durante a participação.
 *
 * Toda a árvore pende de `usability_sessions` com exclusão em cascata: apagar uma
 * sessão apaga execuções, eventos e respostas dela, e não toca em nenhuma tabela de
 * protocolo. É o que faz o pedido de exclusão pelo código do participante ser uma
 * operação e não um roteiro.
 *
 * As referências a protocolo (`suite_id`, `task_id`, `question_id`) são deliberadamente
 * sem cascata: uma definição só é apagada junto com a versão inteira, e uma versão com
 * sessão gravada não é apagada.
 *
 * Nenhuma coluna aqui guarda dado identificável. Eventos carregam metadados — rota,
 * status, latência, nome de campo — nunca conteúdo digitado.
 *
 * Sobre os nomes das chaves estrangeiras, ver a nota no topo de `protocol.ts`.
 */

import {
	boolean,
	char,
	foreignKey,
	index,
	int,
	json,
	mysqlEnum,
	mysqlTable,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/mysql-core";

import { nowMs, timestampMs } from "./columns";
import {
	ageRanges,
	chainRoles,
	educationLevels,
	outcomes,
	personaKeys,
	screenSizes,
	sessionStatuses,
} from "./enums";
import { protocolVersions, questions, suiteDefs, taskDefs } from "./protocol";

/**
 * Concentra caracterização, consentimento, aparelho e totais.
 *
 * O screener é coluna tipada e não bloco livre: caracterizar quem se encaixa como
 * usuário é pergunta de pesquisa, então cruzar conclusão por escolaridade precisa ser
 * consulta, não script de normalização.
 */
export const sessions = mysqlTable(
	"usability_sessions",
	{
		id: char("id", { length: 36 }).primaryKey(), // uuid gerado no aparelho
		protocolVersionId: char("protocol_version_id", { length: 36 }).notNull(),
		/**
		 * ULID (26 caracteres) atribuído pela aplicação na primeira gravação (E2,
		 * `SessionsRepository.upsertHeader`). Único por construção — sem lógica de
		 * colisão para escrever — e a coluna `unique()` é só a garantia final, não o
		 * mecanismo de geração.
		 *
		 * Era `int autoincrement`: um número que sobe 1, 2, 3... é adivinhável, e é
		 * exatamente esse valor que a exclusão por código de participante (A5) aceita
		 * sem exigir mais nenhuma credencial.
		 */
		participantCode: char("participant_code", { length: 26 })
			.notNull()
			.unique(),
		persona: mysqlEnum("persona", personaKeys).notNull(),
		status: mysqlEnum("status", sessionStatuses)
			.notNull()
			.default("IN_PROGRESS"),

		// estado e cidade: texto resolvido pelo app a partir do catálogo dele, não
		// controlado pelo survey — sem formato fixo garantido
		stateUf: varchar("state_uf", { length: 64 }).notNull(),
		cityName: varchar("city_name", { length: 128 }).notNull(),
		ageRange: mysqlEnum("age_range", ageRanges).notNull(),
		educationLevel: mysqlEnum("education_level", educationLevels).notNull(),
		chainRole: mysqlEnum("chain_role", chainRoles).notNull(),
		wasteContactFrequency: int("waste_contact_frequency").notNull(), // 1..5
		appExperience: int("app_experience").notNull(), // 1..5

		// consentimento
		consentVersion: varchar("consent_version", { length: 32 }).notNull(),
		consentAt: timestampMs("consent_at").notNull(),

		// aparelho — sem modelo exato, para não formar quase-identificador
		deviceOs: varchar("device_os", { length: 32 }).notNull(),
		deviceOsVersion: varchar("device_os_version", { length: 32 }).notNull(),
		appVersion: varchar("app_version", { length: 32 }).notNull(),
		screenSize: mysqlEnum("screen_size", screenSizes).notNull(),

		startedAt: timestampMs("started_at").notNull(),
		finishedAt: timestampMs("finished_at"),
		activeMs: int("active_ms").notNull().default(0),
		wallMs: int("wall_ms").notNull().default(0),
		abandonReason: varchar("abandon_reason", { length: 512 }),
		supersededBy: char("superseded_by", { length: 36 }), // cadeia de reinício

		createdAt: timestampMs("created_at").notNull().default(nowMs()),
		// mantido pelo ORM, e não por `ON UPDATE`: ver a nota em `columns.ts`
		updatedAt: timestampMs("updated_at")
			.notNull()
			.default(nowMs())
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index("sessions_status_created_at").on(t.status, t.createdAt),
		index("sessions_persona").on(t.persona),
		foreignKey({
			name: "fk_sessions_version",
			columns: [t.protocolVersionId],
			foreignColumns: [protocolVersions.id],
		}),
	],
);

export const suiteRuns = mysqlTable(
	"usability_suite_runs",
	{
		id: char("id", { length: 36 }).primaryKey(),
		sessionId: char("session_id", { length: 36 }).notNull(),
		suiteId: char("suite_id", { length: 36 }).notNull(),
		position: int("position").notNull(),
		startedAt: timestampMs("started_at").notNull(),
		finishedAt: timestampMs("finished_at"),
		activeMs: int("active_ms").notNull().default(0),
		wallMs: int("wall_ms").notNull().default(0),
		outcome: mysqlEnum("outcome", outcomes),
		createdAt: timestampMs("created_at").notNull().default(nowMs()),
		updatedAt: timestampMs("updated_at")
			.notNull()
			.default(nowMs())
			.$onUpdate(() => new Date()),
	},
	(t) => [
		// idempotência do checkpoint: reenviar a mesma etapa não cria uma segunda
		uniqueIndex("suite_runs_session_suite").on(t.sessionId, t.suiteId),
		foreignKey({
			name: "fk_suite_runs_session",
			columns: [t.sessionId],
			foreignColumns: [sessions.id],
		}).onDelete("cascade"),
		foreignKey({
			name: "fk_suite_runs_suite",
			columns: [t.suiteId],
			foreignColumns: [suiteDefs.id],
		}),
	],
);

/**
 * Não existe estado "bloqueada": por decisão de produto, falhar uma tarefa não impede
 * as seguintes. Cada uma é tentada e a eficácia registra até onde a pessoa chegou.
 */
export const taskRuns = mysqlTable(
	"usability_task_runs",
	{
		id: char("id", { length: 36 }).primaryKey(),
		suiteRunId: char("suite_run_id", { length: 36 }).notNull(),
		taskId: char("task_id", { length: 36 }).notNull(),
		position: int("position").notNull(),
		startedAt: timestampMs("started_at").notNull(),
		finishedAt: timestampMs("finished_at"),
		activeMs: int("active_ms").notNull().default(0),
		outcome: mysqlEnum("outcome", outcomes),
		autoDetected: boolean("auto_detected").notNull().default(false),
		createdAt: timestampMs("created_at").notNull().default(nowMs()),
		updatedAt: timestampMs("updated_at")
			.notNull()
			.default(nowMs())
			.$onUpdate(() => new Date()),
	},
	(t) => [
		uniqueIndex("task_runs_suite_run_task").on(t.suiteRunId, t.taskId),
		foreignKey({
			name: "fk_task_runs_suite_run",
			columns: [t.suiteRunId],
			foreignColumns: [suiteRuns.id],
		}).onDelete("cascade"),
		foreignKey({
			name: "fk_task_runs_task",
			columns: [t.taskId],
			foreignColumns: [taskDefs.id],
		}),
	],
);

export const events = mysqlTable(
	"usability_events",
	{
		id: char("id", { length: 36 }).primaryKey(),
		sessionId: char("session_id", { length: 36 }).notNull(),
		clientEventId: char("client_event_id", { length: 36 }).notNull(), // idempotência
		// ordem local: o relógio do aparelho não é confiável, então a sequência é que
		// ordena, e `received_at` é o carimbo do servidor
		seq: int("seq").notNull(),
		type: varchar("type", { length: 48 }).notNull(), // api.call | screen.enter | hud.*
		suiteCode: varchar("suite_code", { length: 8 }),
		taskCode: varchar("task_code", { length: 8 }),
		occurredAt: timestampMs("occurred_at").notNull(), // relógio do aparelho
		receivedAt: timestampMs("received_at").notNull().default(nowMs()),
		payload: json("payload").notNull(), // metadados apenas, nunca conteúdo digitado
	},
	(t) => [
		uniqueIndex("events_session_client_event").on(t.sessionId, t.clientEventId),
		index("events_session_seq").on(t.sessionId, t.seq),
		foreignKey({
			name: "fk_events_session",
			columns: [t.sessionId],
			foreignColumns: [sessions.id],
		}).onDelete("cascade"),
	],
);

/**
 * Chave e valor em vez de coluna por pergunta, porque o conjunto de perguntas é
 * definido pelo protocolo versionado — coluna fixa exigiria migração a cada revisão do
 * instrumento. Vale o oposto do screener, cujo conjunto é estável e central à análise.
 *
 * Ressalva de MySQL sobre o índice único: `suite_run_id` é nulo nas perguntas de fim de
 * sessão, e nulos não colidem entre si num índice único — a constraint não impede duas
 * respostas para a mesma pergunta final. A garantia vem da escrita: as respostas finais
 * entram por um endpoint idempotente por sessão, que substitui o bloco inteiro.
 */
export const answers = mysqlTable(
	"usability_answers",
	{
		id: char("id", { length: 36 }).primaryKey(),
		sessionId: char("session_id", { length: 36 }).notNull(),
		suiteRunId: char("suite_run_id", { length: 36 }), // nulo = pergunta de fim de sessão
		questionId: char("question_id", { length: 36 }).notNull(),
		valueText: text("value_text"),
		valueNumber: int("value_number"),
		createdAt: timestampMs("created_at").notNull().default(nowMs()),
	},
	(t) => [
		uniqueIndex("answers_session_run_question").on(
			t.sessionId,
			t.suiteRunId,
			t.questionId,
		),
		foreignKey({
			name: "fk_answers_session",
			columns: [t.sessionId],
			foreignColumns: [sessions.id],
		}).onDelete("cascade"),
		foreignKey({
			name: "fk_answers_suite_run",
			columns: [t.suiteRunId],
			foreignColumns: [suiteRuns.id],
		}).onDelete("cascade"),
		foreignKey({
			name: "fk_answers_question",
			columns: [t.questionId],
			foreignColumns: [questions.id],
		}),
	],
);
