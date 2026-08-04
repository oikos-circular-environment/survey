import { z } from "zod";

import { dashboardProcedure, router } from "../index";
import { getComments } from "../use-cases/get-comments";
import { getDemographics } from "../use-cases/get-demographics";
import { getDomainItems } from "../use-cases/get-domain-items";
import { getHeuristics } from "../use-cases/get-heuristics";
import { getOverview } from "../use-cases/get-overview";
import { getPersonas } from "../use-cases/get-personas";
import { getSuitePersonas } from "../use-cases/get-suite-personas";
import { getSuites } from "../use-cases/get-suites";
import { getTasks } from "../use-cases/get-tasks";
import { getTesterDetail } from "../use-cases/get-tester-detail";
import { getTesters } from "../use-cases/get-testers";
import { listProtocolVersions } from "../use-cases/list-protocol-versions";
import { setProtocolVersionActive } from "../use-cases/set-protocol-version-active";
import { dateRangeInput, paginationInput } from "./schemas";

/**
 * Um procedure por tela do dashboard (Pencil `survey-pencil.pen`). Cada procedure é só
 * validação de input + delegação para o use-case correspondente — nenhuma consulta ou
 * fórmula vive aqui, ver `use-cases/` e `@oikos-circular-environment/survey-db/{repositories,metrics}`.
 *
 * Construído a partir de `dashboardProcedure` (`index.ts`): chave de cliente **e**
 * sessão de administrador do Better Auth, as duas sempre exigidas juntas (S09/S10/A9) —
 * ver `lib/dashboard-guard.ts`.
 */
export const dashboardRouter = router({
	overview: dashboardProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getOverview(ctx.repositories, input)),

	suites: dashboardProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getSuites(ctx.repositories, input)),

	tasks: dashboardProcedure
		.input(dateRangeInput.merge(paginationInput))
		.query(({ ctx, input }) =>
			getTasks(ctx.repositories, {
				range: { from: input.from, to: input.to },
				page: input.page,
				pageSize: input.pageSize,
			}),
		),

	personas: dashboardProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getPersonas(ctx.repositories, input)),

	suitePersonas: dashboardProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getSuitePersonas(ctx.repositories, input)),

	demographics: dashboardProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getDemographics(ctx.repositories, input)),

	heuristics: dashboardProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getHeuristics(ctx.repositories, input)),

	domainItems: dashboardProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getDomainItems(ctx.repositories, input)),

	comments: dashboardProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getComments(ctx.repositories, input)),

	testers: dashboardProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getTesters(ctx.repositories, input)),

	testerDetail: dashboardProcedure
		.input(z.object({ sessionId: z.string() }))
		.query(({ ctx, input }) =>
			getTesterDetail(ctx.repositories, input.sessionId),
		),

	protocolVersions: router({
		list: dashboardProcedure.query(({ ctx }) =>
			listProtocolVersions(ctx.repositories),
		),

		setActive: dashboardProcedure
			.input(z.object({ id: z.string(), isActive: z.boolean() }))
			.mutation(({ ctx, input }) =>
				setProtocolVersionActive(ctx.repositories, input),
			),
	}),
});
