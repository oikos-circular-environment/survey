/**
 * Dados mínimos para exercitar o schema.
 *
 * Não é o seed do protocolo — aquele materializa o instrumento de verdade e chega em
 * S03. Aqui só existe o suficiente para que uma sessão tenha para onde apontar: uma
 * versão, uma persona, uma suíte, uma tarefa e uma pergunta.
 */

import { randomUUID } from "node:crypto";
import {
	personaDefs,
	personaSuites,
	protocolVersions,
	questions,
	sessions,
	suiteDefs,
	taskDefs,
} from "../schema";
import type { TestDatabase } from "./harness";

export interface ProtocolFixture {
	protocolVersionId: string;
	personaId: string;
	suiteId: string;
	taskId: string;
	questionId: string;
}

/**
 * `(key, version)` é único, então chamar o fixture duas vezes na mesma suíte precisa
 * produzir versões diferentes. O contador vive no módulo porque cada suíte roda contra
 * um banco recém-criado — não há estado a compartilhar entre elas.
 */
let nextVersion = 1;

export async function insertProtocolFixture(
	db: TestDatabase,
): Promise<ProtocolFixture> {
	const protocolVersionId = randomUUID();
	const personaId = randomUUID();
	const suiteId = randomUUID();
	const taskId = randomUUID();
	const questionId = randomUUID();

	await db.insert(protocolVersions).values({
		id: protocolVersionId,
		key: "oikos-walkthrough",
		version: nextVersion++,
	});

	await db.insert(personaDefs).values({
		id: personaId,
		protocolVersionId,
		key: "CITIZEN",
		label: "Cidadão",
		description: "Descarta resíduos e acompanha denúncias.",
		position: 1,
	});

	await db.insert(suiteDefs).values({
		id: suiteId,
		protocolVersionId,
		code: "S1",
		title: "Primeiros passos",
		objective: "Entrar no aplicativo e reconhecer a tela inicial.",
	});

	await db.insert(personaSuites).values({ personaId, suiteId, position: 1 });

	await db.insert(taskDefs).values({
		id: taskId,
		suiteId,
		code: "T1",
		title: "Abrir o mapa",
		instruction: "Abra o mapa de denúncias.",
		position: 1,
		successRule: {
			mode: "any",
			signals: [{ kind: "screen", route: "/reports/map" }],
		},
	});

	await db.insert(questions).values({
		id: questionId,
		protocolVersionId,
		key: "satisfaction",
		scope: "PER_SUITE",
		type: "SCALE",
		position: 1,
		label: "O quanto você ficou satisfeito com esta etapa?",
		options: [
			{ value: 1, key: "TERRIBLE", label: "Nada satisfeito" },
			{ value: 2, key: "BAD", label: "Pouco satisfeito" },
			{ value: 3, key: "REGULAR", label: "Neutro" },
			{ value: 4, key: "GOOD", label: "Satisfeito" },
			{ value: 5, key: "EXCELLENT", label: "Muito satisfeito" },
		],
	});

	return { protocolVersionId, personaId, suiteId, taskId, questionId };
}

/**
 * Insere uma sessão completa. `participantCode` fica de fora de propósito: quem atribui
 * é o banco, e passar valor aqui mascararia exatamente o que os testes verificam.
 */
export async function insertSession(
	db: TestDatabase,
	protocolVersionId: string,
	overrides: Partial<typeof sessions.$inferInsert> = {},
): Promise<string> {
	const id = overrides.id ?? randomUUID();
	const now = new Date();

	await db.insert(sessions).values({
		id,
		protocolVersionId,
		persona: "CITIZEN",
		stateUf: "SP",
		cityName: "São Paulo",
		ageRange: "AGE_25_34",
		educationLevel: "HIGHER_COMPLETE",
		chainRole: "NONE",
		wasteContactFrequency: 3,
		appExperience: 4,
		consentVersion: "v1",
		consentAt: now,
		deviceOs: "android",
		deviceOsVersion: "14",
		appVersion: "1.0.0",
		screenSize: "MEDIUM",
		startedAt: now,
		...overrides,
	});

	return id;
}
