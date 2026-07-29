import type { Repositories } from "@oikos-circular-environment/survey-db/repositories/index";
import { TRPCError } from "@trpc/server";

import type { UsabilitySessionUpsertInput } from "../routers/usability-schemas";

export interface UpsertUsabilitySessionResult {
	session_id: string;
	participant_code: string;
	protocol_version: number;
}

/**
 * E2 — cria ou atualiza o cabeçalho da sessão. `protocol_version_id` resolve
 * `(protocol_key, protocol_version)` do input, mas só é usado na primeira gravação:
 * `SessionsRepository.upsertHeader` ignora esse valor para sessões já existentes e
 * devolve a versão originalmente fixada (A2) — reenviar com uma versão diferente não
 * troca nada.
 */
export async function upsertUsabilitySession(
	repositories: Repositories,
	input: UsabilitySessionUpsertInput,
): Promise<UpsertUsabilitySessionResult> {
	const protocolVersionId = await repositories.protocol.getProtocolVersionId(
		input.protocol_key,
		input.protocol_version,
	);
	if (!protocolVersionId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Protocolo "${input.protocol_key}" versão ${input.protocol_version} não encontrado.`,
		});
	}

	const result = await repositories.sessions.upsertHeader({
		id: input.session_id,
		protocolVersionId,
		protocolVersion: input.protocol_version,
		persona: input.persona,
		stateUf: input.screener.state_uf,
		cityName: input.screener.city_name,
		ageRange: input.screener.age_range,
		educationLevel: input.screener.education_level,
		chainRole: input.screener.chain_role,
		wasteContactFrequency: input.screener.waste_contact_frequency,
		appExperience: input.screener.app_experience,
		consentVersion: input.consent.version,
		consentAt: input.consent.accepted_at,
		deviceOs: input.device.os,
		deviceOsVersion: input.device.os_version,
		appVersion: input.device.app_version,
		screenSize: input.device.screen_size,
		startedAt: input.started_at,
	});

	return {
		session_id: result.id,
		participant_code: result.participantCode,
		protocol_version: result.protocolVersion,
	};
}
