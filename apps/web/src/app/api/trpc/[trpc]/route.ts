import { createContext } from "@oikos-circular-environment/survey-api/context";
import { appRouter } from "@oikos-circular-environment/survey-api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

function handler(req: NextRequest) {
	return fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		router: appRouter,
		createContext: () => createContext(req),
		// "cabeçalho que informa quando tentar de novo" (S08): a janela do limitador é
		// fixa em 60s, então o valor é constante — não precisa rastrear o restante da
		// janela por IP só para compor este header.
		responseMeta({ errors }) {
			const rateLimited = errors.some(
				(error) => error.code === "TOO_MANY_REQUESTS",
			);
			return rateLimited
				? { headers: new Headers({ "Retry-After": "60" }) }
				: {};
		},
	});
}

export { handler as GET, handler as POST };
