import { and, eq } from "drizzle-orm";

import { sessions } from "../schema/collection";

/**
 * Recorte que alimenta toda métrica do painel: só sessões da versão de protocolo
 * analisada e com status COMPLETED. Sessões em andamento, abandonadas ou descartadas
 * não entram em Te/Tf/Ts nem nas distribuições por pergunta.
 */
export function completedSessionsOf(protocolVersionId: string) {
	return and(
		eq(sessions.protocolVersionId, protocolVersionId),
		eq(sessions.status, "COMPLETED"),
	);
}
