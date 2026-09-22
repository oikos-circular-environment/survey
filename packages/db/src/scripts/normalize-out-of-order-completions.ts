import "../load-env";

import { env } from "@survey/env/server";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { createDb } from "../index";
import type {
	QueryMatcher,
	SuccessRule,
	SuccessSignal,
} from "../protocol/types";
import {
	events,
	protocolVersions,
	sessions,
	suiteDefs,
	suiteRuns,
	taskDefs,
	taskRuns,
} from "../schema";

/**
 * Aplica o critério de conclusão usado na análise: a tarefa conta como concluída quando
 * o sinal de sucesso dela aparece na sessão, mesmo que o participante tenha realizado a
 * ação enquanto outra tarefa estava ativa. O app só observa os sinais da tarefa ativa,
 * então execuções fora da ordem ficam registradas como não concluídas.
 *
 * A execução passa a `outcome = YES` com `auto_detected = false`, o que preserva a
 * distinção entre o que o app detectou sozinho e o que foi reconhecido depois. O
 * resultado da suíte é recalculado a partir das tarefas. Nada é inventado: só entra
 * tarefa cujo sinal está registrado em `usability_events`.
 *
 * Fora de localhost exige `NORMALIZE_ALLOW_REMOTE=1`.
 */

const PROTOCOL_KEY = "oikos-walkthrough";

if (
	!env.DATABASE_URL.includes("localhost") &&
	process.env.NORMALIZE_ALLOW_REMOTE !== "1"
) {
	throw new Error(
		"DATABASE_URL não aponta pra localhost. Rode com NORMALIZE_ALLOW_REMOTE=1 só depois de ter backup.",
	);
}

const db = createDb();

function matchesQuery(
	matchers: Record<string, QueryMatcher> | undefined,
	payload: Record<string, unknown>,
): boolean {
	if (!matchers) return true;
	for (const [key, matcher] of Object.entries(matchers)) {
		const value = payload[key];
		if (matcher === true) {
			if (value === undefined || value === null) return false;
		} else if (typeof matcher === "string") {
			if (String(value) !== matcher) return false;
		} else if (
			value === undefined ||
			value === null ||
			String(value) === matcher.not
		) {
			return false;
		}
	}
	return true;
}

function pathMatches(pattern: string, path: string): boolean {
	const regex = new RegExp(`^${pattern.replace(/:[a-zA-Z]+/g, "[^/]+")}$`);
	return regex.test(path);
}

function routeMatches(route: string, actual: string): boolean {
	const regex = new RegExp(`^${route.replace(/\[[^/\]]+\]/g, "[^/]+")}$`);
	return regex.test(actual);
}

interface EventRow {
	type: string;
	payload: unknown;
}

function signalOccurred(signal: SuccessSignal, list: EventRow[]): boolean {
	return list.some((event) => {
		const payload = (event.payload ?? {}) as Record<string, unknown>;
		if (signal.kind === "api") {
			return (
				event.type === "api.call" &&
				payload.method === signal.method &&
				payload.status === signal.status &&
				pathMatches(signal.path_pattern, String(payload.path ?? "")) &&
				matchesQuery(
					signal.query,
					(payload.query ?? {}) as Record<string, unknown>,
				)
			);
		}
		if (signal.kind === "screen") {
			return (
				event.type === "screen.enter" &&
				routeMatches(signal.route, String(payload.route ?? ""))
			);
		}
		return (
			event.type === "ui.event" &&
			payload.name === signal.name &&
			matchesQuery(signal.payload, payload)
		);
	});
}

function ruleSatisfied(rule: SuccessRule, list: EventRow[]): boolean {
	const results = rule.signals.map((signal) => signalOccurred(signal, list));
	return rule.mode === "all" ? results.every(Boolean) : results.some(Boolean);
}

const [target] = await db
	.select({ id: protocolVersions.id, version: protocolVersions.version })
	.from(protocolVersions)
	.where(
		and(
			eq(protocolVersions.key, PROTOCOL_KEY),
			eq(protocolVersions.isActive, true),
		),
	);
if (!target) throw new Error(`Nenhuma versão ativa de "${PROTOCOL_KEY}".`);

const pending = await db
	.select({
		taskRunId: taskRuns.id,
		suiteRunId: taskRuns.suiteRunId,
		sessionId: suiteRuns.sessionId,
		participantCode: sessions.participantCode,
		taskCode: taskDefs.code,
		successRule: taskDefs.successRule,
	})
	.from(taskRuns)
	.innerJoin(suiteRuns, eq(suiteRuns.id, taskRuns.suiteRunId))
	.innerJoin(sessions, eq(sessions.id, suiteRuns.sessionId))
	.innerJoin(taskDefs, eq(taskDefs.id, taskRuns.taskId))
	.innerJoin(suiteDefs, eq(suiteDefs.id, taskDefs.suiteId))
	.where(
		and(
			eq(suiteDefs.protocolVersionId, target.id),
			eq(sessions.status, "COMPLETED"),
			eq(taskRuns.outcome, "NO"),
			isNotNull(taskRuns.finishedAt),
		),
	);

const sessionIds = [...new Set(pending.map((p) => p.sessionId))];
const eventsBySession = new Map<string, EventRow[]>();
if (sessionIds.length > 0) {
	const rows = await db
		.select({
			sessionId: events.sessionId,
			type: events.type,
			payload: events.payload,
		})
		.from(events)
		.where(inArray(events.sessionId, sessionIds));
	for (const row of rows) {
		const list = eventsBySession.get(row.sessionId) ?? [];
		list.push({ type: row.type, payload: row.payload });
		eventsBySession.set(row.sessionId, list);
	}
}

const reconhecidas: string[] = [];
const suiteRunIds = new Set<string>();

for (const run of pending) {
	const list = eventsBySession.get(run.sessionId) ?? [];
	if (list.length === 0) continue;
	if (!ruleSatisfied(run.successRule as SuccessRule, list)) continue;

	await db
		.update(taskRuns)
		.set({ outcome: "YES", autoDetected: false })
		.where(eq(taskRuns.id, run.taskRunId));
	suiteRunIds.add(run.suiteRunId);
	reconhecidas.push(`${run.participantCode} / ${run.taskCode}`);
}

for (const suiteRunId of suiteRunIds) {
	const tasks = await db
		.select({ outcome: taskRuns.outcome })
		.from(taskRuns)
		.where(eq(taskRuns.suiteRunId, suiteRunId));
	const outcomes = tasks.map((t) => t.outcome).filter((o) => o !== null);
	const yes = outcomes.filter((o) => o === "YES").length;
	const outcome =
		outcomes.length === 0
			? null
			: yes === outcomes.length
				? "YES"
				: yes === 0
					? "NO"
					: "PARTIAL";
	await db
		.update(suiteRuns)
		.set({ outcome })
		.where(eq(suiteRuns.id, suiteRunId));
}

console.log(
	`Tarefas reconhecidas como concluídas fora da ordem: ${reconhecidas.length} (de ${pending.length} não concluídas na v${target.version}).`,
);
for (const linha of reconhecidas) console.log(`  ${linha}`);

process.exit(0);
