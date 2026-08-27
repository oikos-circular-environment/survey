/**
 * `route-signals.generated.json` é lido pelo ticket `A01`, no repositório `api`. O teste
 * de deriva garante que ele nunca fica desatualizado: se `data.ts` mudar sem rodar
 * `generate-route-signals.ts`, este teste quebra a CI antes que alguém perceba a mão.
 */

import { describe, expect, test } from "bun:test";
import { protocol } from "./data";
import {
	buildRouteSignalsArtifact,
	extractRouteSignals,
} from "./route-signals";
import routeSignalsOnDisk from "./route-signals.generated.json";

describe("extractRouteSignals", () => {
	const signals = extractRouteSignals(protocol);

	test("ignora sinais kind: screen (T11 não gera entrada)", () => {
		expect(signals.some((s) => s.taskCode === "T11")).toBe(false);
	});

	test("tarefa com composição all gera um sinal por api (T16)", () => {
		expect(signals.filter((s) => s.taskCode === "T16")).toHaveLength(2);
	});

	test("tarefas com um único sinal api geram uma entrada", () => {
		expect(signals.filter((s) => s.taskCode === "T17")).toHaveLength(1);
	});
});

describe("route-signals.generated.json", () => {
	test("está sincronizado com data.ts", () => {
		expect(routeSignalsOnDisk).toEqual(buildRouteSignalsArtifact(protocol));
	});
});
