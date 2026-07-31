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

	test("tarefas com composição all geram um sinal por api (T3, T7, T16)", () => {
		for (const taskCode of ["T3", "T7", "T16"] as const) {
			expect(signals.filter((s) => s.taskCode === taskCode)).toHaveLength(2);
		}
	});

	test("tarefas com um único sinal api geram uma entrada", () => {
		expect(signals.filter((s) => s.taskCode === "T1")).toHaveLength(1);
	});
});

describe("route-signals.generated.json", () => {
	test("está sincronizado com data.ts", () => {
		expect(routeSignalsOnDisk).toEqual(buildRouteSignalsArtifact(protocol));
	});
});
