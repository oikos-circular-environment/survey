import { z } from "zod";

import { publicProcedure, router } from "../index";
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
import { dateRangeInput, paginationInput } from "./schemas";

/**
 * Um procedure por tela do dashboard (Pencil `survey-pencil.pen`). Cada procedure é só
 * validação de input + delegação para o use-case correspondente — nenhuma consulta ou
 * fórmula vive aqui, ver `use-cases/` e `@survey/db/{repositories,metrics}`.
 */
export const dashboardRouter = router({
	overview: publicProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getOverview(ctx.repositories, input)),

	suites: publicProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getSuites(ctx.repositories, input)),

	tasks: publicProcedure
		.input(dateRangeInput.merge(paginationInput))
		.query(({ ctx, input }) =>
			getTasks(ctx.repositories, {
				range: { from: input.from, to: input.to },
				page: input.page,
				pageSize: input.pageSize,
			}),
		),

	personas: publicProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getPersonas(ctx.repositories, input)),

	suitePersonas: publicProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getSuitePersonas(ctx.repositories, input)),

	demographics: publicProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getDemographics(ctx.repositories, input)),

	heuristics: publicProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getHeuristics(ctx.repositories, input)),

	domainItems: publicProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getDomainItems(ctx.repositories, input)),

	comments: publicProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getComments(ctx.repositories, input)),

	testers: publicProcedure
		.input(dateRangeInput)
		.query(({ ctx, input }) => getTesters(ctx.repositories, input)),

	testerDetail: publicProcedure
		.input(z.object({ sessionId: z.string() }))
		.query(({ ctx, input }) =>
			getTesterDetail(ctx.repositories, input.sessionId),
		),
});
