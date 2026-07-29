import "../load-env";

import { createDb } from "../index";
import { protocol } from "../protocol/data";
import { seedProtocol } from "../seed/seed";
import { insertFactorySession } from "./insert";
import { resolveSeededProtocol } from "./resolve-seeded-protocol";
import { buildFactorySession } from "./session-factory";

const SESSION_COUNT = Number(process.env.DEMO_SESSION_COUNT ?? 30);

const db = createDb();

const seedResult = await seedProtocol(db, protocol);
console.log(
	seedResult.status === "created"
		? `Protocolo publicado (${seedResult.protocolVersionId}).`
		: `Protocolo já publicado (${seedResult.protocolVersionId}).`,
);

const seeded = await resolveSeededProtocol(db, protocol.key, protocol.version);

for (let i = 0; i < SESSION_COUNT; i++) {
	const factory = buildFactorySession(seeded);
	const { sessionId } = await insertFactorySession(db, factory);
	console.log(
		`[${i + 1}/${SESSION_COUNT}] ${factory.session.persona} ${factory.session.status} — ${sessionId}`,
	);
}

console.log(`${SESSION_COUNT} sessões fake inseridas.`);
process.exit(0);
