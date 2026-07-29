import { eq } from "drizzle-orm";
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

export interface SessionDetailRow {
	id: string;
	participantCode: number;
	persona: string;
	status: string;
	stateUf: string;
	cityName: string;
	ageRange: string;
	educationLevel: string;
	chainRole: string;
	wasteContactFrequency: number;
	appExperience: number;
	consentVersion: string;
	consentAt: Date;
	deviceOs: string;
	deviceOsVersion: string;
	appVersion: string;
	screenSize: string;
	startedAt: Date;
	finishedAt: Date | null;
	activeMs: number;
	wallMs: number;
	abandonReason: string | null;
}

const detailColumns = {
	id: sessions.id,
	participantCode: sessions.participantCode,
	persona: sessions.persona,
	status: sessions.status,
	stateUf: sessions.stateUf,
	cityName: sessions.cityName,
	ageRange: sessions.ageRange,
	educationLevel: sessions.educationLevel,
	chainRole: sessions.chainRole,
	wasteContactFrequency: sessions.wasteContactFrequency,
	appExperience: sessions.appExperience,
	consentVersion: sessions.consentVersion,
	consentAt: sessions.consentAt,
	deviceOs: sessions.deviceOs,
	deviceOsVersion: sessions.deviceOsVersion,
	appVersion: sessions.appVersion,
	screenSize: sessions.screenSize,
	startedAt: sessions.startedAt,
	finishedAt: sessions.finishedAt,
	activeMs: sessions.activeMs,
	wallMs: sessions.wallMs,
	abandonReason: sessions.abandonReason,
} as const;

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

	/**
	 * Sessões no período com todas as colunas — alimenta o painel de gerenciamento de
	 * testadores (lista completa: aparelho, tempos, consentimento, screener inteiro).
	 * Nenhuma coluna aqui guarda dado identificável, ver a nota em `schema/collection.ts`.
	 */
	async findAllDetailedInRange(range: DateRange): Promise<SessionDetailRow[]> {
		return this.db
			.select(detailColumns)
			.from(sessions)
			.where(dateRangeFilter(sessions.startedAt, range));
	}

	/** Uma sessão específica, com todas as colunas — para o painel de detalhe do testador. */
	async findDetailById(
		sessionId: string,
	): Promise<SessionDetailRow | undefined> {
		const [row] = await this.db
			.select(detailColumns)
			.from(sessions)
			.where(eq(sessions.id, sessionId));
		return row;
	}
}
