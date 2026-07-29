import type { MySql2Database } from "drizzle-orm/mysql2";

import { sessions } from "../schema/collection";
import type * as schema from "../schema/index";
import { type DateRange, dateRangeFilter } from "./date-range";

type Db = MySql2Database<typeof schema>;

export interface SessionRow {
	id: string;
	persona: string;
	status: string;
	startedAt: Date;
	ageRange: string;
	educationLevel: string;
	chainRole: string;
	wasteContactFrequency: number;
	appExperience: number;
}

/** Acesso de leitura a `usability_sessions`. */
export class SessionsRepository {
	constructor(private readonly db: Db) {}

	/** Sessões no período, com os campos de screener usados na Caracterização/Visão geral. */
	async findInRange(range: DateRange): Promise<SessionRow[]> {
		return this.db
			.select({
				id: sessions.id,
				persona: sessions.persona,
				status: sessions.status,
				startedAt: sessions.startedAt,
				ageRange: sessions.ageRange,
				educationLevel: sessions.educationLevel,
				chainRole: sessions.chainRole,
				wasteContactFrequency: sessions.wasteContactFrequency,
				appExperience: sessions.appExperience,
			})
			.from(sessions)
			.where(dateRangeFilter(sessions.startedAt, range));
	}
}
