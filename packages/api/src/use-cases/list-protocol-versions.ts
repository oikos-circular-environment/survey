import type { Repositories } from "@oikos-circular-environment/survey-db/repositories/index";

export interface ProtocolVersionResponse {
	id: string;
	key: string;
	version: number;
	publishedAt: number;
	isActive: boolean;
}

/** Todas as versões de todas as `key`s, para a tela de administração do painel. */
export async function listProtocolVersions(
	repositories: Repositories,
): Promise<ProtocolVersionResponse[]> {
	const rows = await repositories.protocol.listProtocolVersions();
	return rows.map((row) => ({
		id: row.id,
		key: row.key,
		version: row.version,
		publishedAt: row.publishedAt.getTime(),
		isActive: row.isActive,
	}));
}
