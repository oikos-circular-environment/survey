import { protocol } from "./data";
import { buildRouteSignalsArtifact } from "./route-signals";

const artifact = buildRouteSignalsArtifact(protocol);
const path = new URL("./route-signals.generated.json", import.meta.url)
	.pathname;

await Bun.write(path, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`${path} atualizado (${artifact.signals.length} sinais).`);
