/**
 * Exportador dos padrões de rota declarados nas `SuccessRule` do protocolo, num formato
 * consumível por outro repositório: o ticket `A01`, na API principal, roda em CI
 * comparando este artefato contra as rotas reais — se uma rota mudar sem que o sinal de
 * detecção acompanhe, é aqui que a quebra aparece, antes de contaminar dado de pesquisa
 * em silêncio.
 *
 * Só sinais `kind: "api"` entram — um sinal `kind: "screen"` (como o da T11) não
 * corresponde a nenhuma rota e não gera entrada.
 */

import type { HttpMethod, Protocol, TaskCode } from "./types";

export interface RouteSignal {
	taskCode: TaskCode;
	method: HttpMethod;
	pathPattern: string;
}

export function extractRouteSignals(protocol: Protocol): RouteSignal[] {
	const signals: RouteSignal[] = [];

	for (const task of protocol.tasks) {
		for (const signal of task.success.signals) {
			if (signal.kind !== "api") continue;
			signals.push({
				taskCode: task.code,
				method: signal.method,
				pathPattern: signal.path_pattern,
			});
		}
	}

	return signals;
}

export interface RouteSignalsArtifact {
	/** Versão do formato do artefato — não confundir com `protocolVersion`. */
	formatVersion: 1;
	protocolKey: string;
	protocolVersion: number;
	signals: RouteSignal[];
}

export function buildRouteSignalsArtifact(
	protocol: Protocol,
): RouteSignalsArtifact {
	return {
		formatVersion: 1,
		protocolKey: protocol.key,
		protocolVersion: protocol.version,
		signals: extractRouteSignals(protocol),
	};
}
