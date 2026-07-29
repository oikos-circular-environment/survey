import { publicProcedure, router } from "../index";
import { dashboardRouter } from "./dashboard";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	dashboard: dashboardRouter,
});
export type AppRouter = typeof appRouter;
