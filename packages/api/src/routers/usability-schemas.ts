import {
	ageRanges,
	chainRoles,
	educationLevels,
	outcomes,
	personaKeys,
	screenSizes,
} from "@oikos-circular-environment/survey-db/schema/index";
import { z } from "zod";

/**
 * Zod dos cinco endpoints públicos de usabilidade (E1–E5, `02-tech-plan.md` §"Contrato
 * dos endpoints"). Vive separado de `schemas.ts` (schemas do painel) porque este é o
 * contrato externo consumido pelo aplicativo — não um detalhe de query do dashboard.
 *
 * As 27 UFs existem só aqui, não em `packages/db`: `sessions.state_uf` é
 * `varchar` livre (migração 0005), porque o valor vem de um catálogo externo ao app —
 * mas o critério de aceite de S05 pede recusa de "estado da federação inexistente", e
 * essa validação é da borda de entrada, não do armazenamento.
 */
const BRAZILIAN_STATE_CODES = [
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO",
] as const;

const screenerInput = z.object({
	state_uf: z.enum(BRAZILIAN_STATE_CODES),
	city_name: z.string().min(1).max(128),
	age_range: z.enum(ageRanges),
	education_level: z.enum(educationLevels),
	chain_role: z.enum(chainRoles),
	waste_contact_frequency: z.number().int().min(1).max(5),
	app_experience: z.number().int().min(1).max(5),
});

const consentInput = z.object({
	version: z.string().min(1).max(32),
	accepted_at: z.coerce.date(),
});

const deviceInput = z.object({
	os: z.string().min(1).max(32),
	os_version: z.string().min(1).max(32),
	app_version: z.string().min(1).max(32),
	screen_size: z.enum(screenSizes),
});

export const usabilitySessionUpsertInput = z.object({
	session_id: z.string().min(1).max(36),
	protocol_key: z.string().min(1).max(64),
	protocol_version: z.number().int().min(1),
	persona: z.enum(personaKeys),
	screener: screenerInput,
	consent: consentInput,
	device: deviceInput,
	started_at: z.coerce.date(),
});
export type UsabilitySessionUpsertInput = z.infer<
	typeof usabilitySessionUpsertInput
>;

const answerInput = z.object({
	question_key: z.string().min(1).max(64),
	value_text: z.string().max(4000).optional(),
	value_number: z.number().optional(),
});
export type UsabilityAnswerInput = z.infer<typeof answerInput>;

const chunkInput = z.object({
	index: z.number().int().min(0),
	total: z.number().int().min(1),
});

const checkpointSuiteInput = z.object({
	code: z.string().min(1).max(8),
	position: z.number().int().min(0),
	started_at: z.coerce.date(),
	finished_at: z.coerce.date().optional(),
	active_ms: z.number().int().min(0),
	wall_ms: z.number().int().min(0),
	outcome: z.enum(outcomes).optional(),
});

const checkpointTaskInput = z.object({
	code: z.string().min(1).max(8),
	position: z.number().int().min(0),
	started_at: z.coerce.date(),
	finished_at: z.coerce.date().optional(),
	active_ms: z.number().int().min(0),
	outcome: z.enum(outcomes).optional(),
	auto_detected: z.boolean(),
});

const checkpointEventInput = z.object({
	client_event_id: z.string().min(1).max(36),
	seq: z.number().int().min(0),
	type: z.string().min(1).max(48),
	suite_code: z.string().max(8).optional(),
	task_code: z.string().max(8).optional(),
	occurred_at: z.coerce.date(),
	payload: z.record(z.string(), z.unknown()),
});

export const usabilityCheckpointInput = z.object({
	session_id: z.string().min(1).max(36),
	suite_run_id: z.uuid().optional(),
	chunk: chunkInput,
	suite: checkpointSuiteInput,
	tasks: z.array(checkpointTaskInput).default([]),
	events: z.array(checkpointEventInput).default([]),
	answers: z.array(answerInput).default([]),
});
export type UsabilityCheckpointInput = z.infer<typeof usabilityCheckpointInput>;

export const usabilityFinishInput = z.object({
	session_id: z.string().min(1).max(36),
	answers: z.array(answerInput),
	active_ms: z.number().int().min(0),
	wall_ms: z.number().int().min(0),
	finished_at: z.coerce.date(),
});
export type UsabilityFinishInput = z.infer<typeof usabilityFinishInput>;

export const usabilityAbandonInput = z.object({
	session_id: z.string().min(1).max(36),
	reason: z.string().max(512).optional(),
	current_suite_code: z.string().max(8).optional(),
	active_ms: z.number().int().min(0),
	wall_ms: z.number().int().min(0),
	finished_at: z.coerce.date(),
});
export type UsabilityAbandonInput = z.infer<typeof usabilityAbandonInput>;
