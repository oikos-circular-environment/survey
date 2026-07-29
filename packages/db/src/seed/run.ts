import "../load-env";

import { createDb } from "../index";
import { protocol } from "../protocol/data";
import { seedProtocol } from "./seed";

const db = createDb();
const result = await seedProtocol(db, protocol);

console.log(
	result.status === "created"
		? `Versão ${protocol.version} de "${protocol.key}" publicada (${result.protocolVersionId}).`
		: `Versão ${protocol.version} de "${protocol.key}" já publicada — nada a fazer.`,
);

process.exit(0);
