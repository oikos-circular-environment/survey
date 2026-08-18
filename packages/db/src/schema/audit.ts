/**
 * Snapshot de auditoria gravado por `SessionsRepository.hardDelete` — sem FK para
 * `usability_sessions` (a linha some no mesmo delete) nem para auth (mesmo limite de
 * `auth.ts`).
 */

import {
	char,
	index,
	int,
	mysqlEnum,
	mysqlTable,
	varchar,
} from "drizzle-orm/mysql-core";

import { timestampMs } from "./columns";
import {
	ageRanges,
	educationLevels,
	personaKeys,
	sessionStatuses,
} from "./enums";

export const deletedTesters = mysqlTable(
	"usability_deleted_testers",
	{
		id: char("id", { length: 36 }).primaryKey(),
		sessionId: char("session_id", { length: 36 }).notNull(),
		participantCode: char("participant_code", { length: 26 }).notNull(),
		persona: mysqlEnum("persona", personaKeys).notNull(),
		status: mysqlEnum("status", sessionStatuses).notNull(),
		stateUf: varchar("state_uf", { length: 64 }).notNull(),
		cityName: varchar("city_name", { length: 128 }).notNull(),
		ageRange: mysqlEnum("age_range", ageRanges).notNull(),
		educationLevel: mysqlEnum("education_level", educationLevels).notNull(),
		deviceOs: varchar("device_os", { length: 32 }).notNull(),
		deviceOsVersion: varchar("device_os_version", { length: 32 }).notNull(),
		startedAt: timestampMs("started_at").notNull(),
		finishedAt: timestampMs("finished_at"),
		activeMs: int("active_ms").notNull().default(0),
		deletedAt: timestampMs("deleted_at").notNull(),
		deletedByUserId: varchar("deleted_by_user_id", { length: 64 }).notNull(),
	},
	(t) => [index("deleted_testers_deleted_at").on(t.deletedAt)],
);
