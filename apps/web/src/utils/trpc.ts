import type { AppRouter } from "@oikos-circular-environment/survey-api/routers/index";
import { env } from "@survey/env/web";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			toast.error(error.message, {
				action: {
					label: "retry",
					onClick: () => {
						query.invalidate();
					},
				},
			});
		},
	}),
});

/**
 * O próprio `web` é cliente do próprio backend (S08 estendido, ver `apiKeyProcedure` em
 * `packages/api`): toda procedure tRPC exige esta chave, sem exceção para chamadas de
 * dentro do app. Extraída à parte para `trpc.test.ts` verificar sem montar o cliente
 * inteiro.
 */
export function clientHeaders(): Record<string, string> {
	return { "x-client-key": env.NEXT_PUBLIC_CLIENT_API_KEY };
}

const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: "/api/trpc",
			headers: clientHeaders,
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
