import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { ulid } from "ulid";

import { deletedTesters } from "../schema/audit";
import { sessions } from "../schema/collection";
import type {
	ageRanges,
	chainRoles,
	educationLevels,
	personaKeys,
	screenSizes,
} from "../schema/enums";
import type * as schema from "../schema/index";
import { protocolVersions } from "../schema/protocol";
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
	protocolVersionId: string;
	participantCode: string;
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
	protocolVersionId: sessions.protocolVersionId,
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

export interface DeletedTesterRow {
	sessionId: string;
	participantCode: string;
	persona: string;
	status: string;
	stateUf: string;
	cityName: string;
	ageRange: string;
	educationLevel: string;
	deviceOs: string;
	deviceOsVersion: string;
	startedAt: Date;
	finishedAt: Date | null;
	activeMs: number;
	deletedAt: Date;
}

export interface SessionStateRow {
	id: string;
	status: string;
	protocolVersionId: string;
	participantCode: string;
	supersededBy: string | null;
}

export interface UpsertSessionHeaderInput {
	id: string;
	protocolVersionId: string;
	protocolVersion: number;
	persona: (typeof personaKeys)[number];
	stateUf: string;
	cityName: string;
	ageRange: (typeof ageRanges)[number];
	educationLevel: (typeof educationLevels)[number];
	chainRole: (typeof chainRoles)[number];
	wasteContactFrequency: number;
	appExperience: number;
	consentVersion: string;
	consentAt: Date;
	deviceOs: string;
	deviceOsVersion: string;
	appVersion: string;
	screenSize: (typeof screenSizes)[number];
	startedAt: Date;
}

export interface UpsertSessionHeaderResult {
	id: string;
	participantCode: string;
	protocolVersion: number;
}

export interface FinishSessionInput {
	activeMs: number;
	wallMs: number;
	finishedAt: Date;
}

export interface AbandonSessionInput {
	reason?: string;
	activeMs: number;
	wallMs: number;
	finishedAt: Date;
}

/** Acesso a `usability_sessions` — leitura para o painel, escrita para E2/E4/E5. */
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

	/**
	 * Estado mínimo de uma sessão — usado por E3/E4/E5 para checar existência (404 se
	 * ausente) sem carregar todas as colunas de `findDetailById`.
	 */
	async findStateById(sessionId: string): Promise<SessionStateRow | undefined> {
		const [row] = await this.db
			.select({
				id: sessions.id,
				status: sessions.status,
				protocolVersionId: sessions.protocolVersionId,
				participantCode: sessions.participantCode,
				supersededBy: sessions.supersededBy,
			})
			.from(sessions)
			.where(eq(sessions.id, sessionId));
		return row;
	}

	/**
	 * Cria ou atualiza o cabeçalho da sessão (E2). Na primeira gravação atribui
	 * `participantCode` (ULID) e fixa `protocolVersionId` — nenhuma chamada posterior
	 * muda esses dois, mesmo que o corpo enviado traga uma versão de protocolo
	 * diferente (A2): o `protocolVersionId`/`protocolVersion` resolvidos aqui são
	 * sempre os da sessão já existente, nunca os do `input`, quando ela já existe.
	 */
	async upsertHeader(
		input: UpsertSessionHeaderInput,
	): Promise<UpsertSessionHeaderResult> {
		const [existing] = await this.db
			.select({
				participantCode: sessions.participantCode,
				protocolVersion: protocolVersions.version,
			})
			.from(sessions)
			.innerJoin(
				protocolVersions,
				eq(sessions.protocolVersionId, protocolVersions.id),
			)
			.where(eq(sessions.id, input.id));

		const headerFields = {
			persona: input.persona,
			stateUf: input.stateUf,
			cityName: input.cityName,
			ageRange: input.ageRange,
			educationLevel: input.educationLevel,
			chainRole: input.chainRole,
			wasteContactFrequency: input.wasteContactFrequency,
			appExperience: input.appExperience,
			consentVersion: input.consentVersion,
			consentAt: input.consentAt,
			deviceOs: input.deviceOs,
			deviceOsVersion: input.deviceOsVersion,
			appVersion: input.appVersion,
			screenSize: input.screenSize,
			startedAt: input.startedAt,
		} as const;

		if (existing) {
			await this.db
				.update(sessions)
				.set(headerFields)
				.where(eq(sessions.id, input.id));

			return {
				id: input.id,
				participantCode: existing.participantCode,
				protocolVersion: existing.protocolVersion,
			};
		}

		const participantCode = ulid();
		await this.db.insert(sessions).values({
			id: input.id,
			protocolVersionId: input.protocolVersionId,
			participantCode,
			...headerFields,
		});

		return {
			id: input.id,
			participantCode,
			protocolVersion: input.protocolVersion,
		};
	}

	/**
	 * Marca `COMPLETED` (E4). Idempotente por natureza: reenviar grava os mesmos
	 * totais informados pelo aparelho, sem somar com o que já estava salvo — quem soma
	 * é o próprio aparelho, que envia o acumulado inteiro a cada chamada.
	 */
	async markCompleted(
		sessionId: string,
		input: FinishSessionInput,
	): Promise<void> {
		await this.db
			.update(sessions)
			.set({
				status: "COMPLETED",
				activeMs: input.activeMs,
				wallMs: input.wallMs,
				finishedAt: input.finishedAt,
			})
			.where(eq(sessions.id, sessionId));
	}

	/** Marca `ABANDONED` (E5), com o motivo opcional e o ponto em que a pessoa parou. */
	async markAbandoned(
		sessionId: string,
		input: AbandonSessionInput,
	): Promise<void> {
		await this.db
			.update(sessions)
			.set({
				status: "ABANDONED",
				abandonReason: input.reason,
				activeMs: input.activeMs,
				wallMs: input.wallMs,
				finishedAt: input.finishedAt,
			})
			.where(eq(sessions.id, sessionId));
	}

	/**
	 * Fecha a cadeia de reinício: aponta a sessão antiga para a nova. Nenhuma das cinco
	 * procedures chama isto — existe para o reinício (S07), cujo gatilho/chamador não
	 * faz parte deste conjunto (ver `02-tech-plan.md`).
	 */
	async setSupersededBy(
		oldSessionId: string,
		newSessionId: string,
	): Promise<void> {
		await this.db
			.update(sessions)
			.set({ supersededBy: newSessionId })
			.where(eq(sessions.id, oldSessionId));
	}

	/** Mesmo recorte de `findAllDetailedInRange`, lendo de `usability_deleted_testers`. */
	async findDeletedInRange(range: DateRange): Promise<DeletedTesterRow[]> {
		return this.db
			.select({
				sessionId: deletedTesters.sessionId,
				participantCode: deletedTesters.participantCode,
				persona: deletedTesters.persona,
				status: deletedTesters.status,
				stateUf: deletedTesters.stateUf,
				cityName: deletedTesters.cityName,
				ageRange: deletedTesters.ageRange,
				educationLevel: deletedTesters.educationLevel,
				deviceOs: deletedTesters.deviceOs,
				deviceOsVersion: deletedTesters.deviceOsVersion,
				startedAt: deletedTesters.startedAt,
				finishedAt: deletedTesters.finishedAt,
				activeMs: deletedTesters.activeMs,
				deletedAt: deletedTesters.deletedAt,
			})
			.from(deletedTesters)
			.where(dateRangeFilter(deletedTesters.startedAt, range));
	}

	/** Grava o snapshot em `usability_deleted_testers` e apaga a sessão (cascata cuida do resto). */
	async hardDelete(sessionId: string, deletedByUserId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const [row] = await tx
				.select(detailColumns)
				.from(sessions)
				.where(eq(sessions.id, sessionId));

			if (!row) {
				throw new Error(`Sessão não encontrada: ${sessionId}`);
			}

			await tx.insert(deletedTesters).values({
				id: randomUUID(),
				sessionId: row.id,
				participantCode: row.participantCode,
				persona: row.persona,
				status: row.status,
				stateUf: row.stateUf,
				cityName: row.cityName,
				ageRange: row.ageRange,
				educationLevel: row.educationLevel,
				deviceOs: row.deviceOs,
				deviceOsVersion: row.deviceOsVersion,
				startedAt: row.startedAt,
				finishedAt: row.finishedAt,
				activeMs: row.activeMs,
				deletedAt: new Date(),
				deletedByUserId,
			});

			await tx.delete(sessions).where(eq(sessions.id, sessionId));
		});
	}
}
