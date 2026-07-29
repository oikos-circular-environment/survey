import { apiKeyProcedure, router } from "../index";
import { dashboardRouter } from "./dashboard";
import { usabilityRouter } from "./usability";

export const appRouter = router({
	healthCheck: apiKeyProcedure.query(() => {
		return "OK";
	}),
	dashboard: dashboardRouter,
	usability: usabilityRouter,
});
export type AppRouter = typeof appRouter;
