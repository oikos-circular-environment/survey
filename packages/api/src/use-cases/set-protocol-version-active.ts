import type { Repositories } from "@oikos-circular-environment/survey-db/repositories/index";

/**
 * Liga/desliga uma versão para novos participantes (E1). A exclusividade por `key`
 * (ativar uma desativa as irmãs) é garantida transacionalmente no repositório.
 */
export async function setProtocolVersionActive(
	repositories: Repositories,
	input: { id: string; isActive: boolean },
): Promise<void> {
	await repositories.protocol.setProtocolVersionActive(
		input.id,
		input.isActive,
	);
}
