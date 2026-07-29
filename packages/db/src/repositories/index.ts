import type { MySql2Database } from "drizzle-orm/mysql2";

import type * as schema from "../schema/index";
import { AnswersRepository } from "./answers-repository";
import { ProtocolRepository } from "./protocol-repository";
import { SessionsRepository } from "./sessions-repository";
import { SuiteRunsRepository } from "./suite-runs-repository";
import { TaskRunsRepository } from "./task-runs-repository";

export * from "./answers-repository";
export * from "./date-range";
export * from "./protocol-repository";
export * from "./sessions-repository";
export * from "./suite-runs-repository";
export * from "./task-runs-repository";

type Db = MySql2Database<typeof schema>;

/**
 * Agrupa um repositório de cada agregado para injeção única no contexto do tRPC — os
 * use-cases recebem `Repositories` em vez de `db` bruto, então nenhuma camada acima de
 * `packages/db` monta SQL diretamente.
 */
export interface Repositories {
	protocol: ProtocolRepository;
	suiteRuns: SuiteRunsRepository;
	taskRuns: TaskRunsRepository;
	answers: AnswersRepository;
	sessions: SessionsRepository;
}

export function createRepositories(db: Db): Repositories {
	return {
		protocol: new ProtocolRepository(db),
		suiteRuns: new SuiteRunsRepository(db),
		taskRuns: new TaskRunsRepository(db),
		answers: new AnswersRepository(db),
		sessions: new SessionsRepository(db),
	};
}
