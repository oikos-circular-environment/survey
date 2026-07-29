import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	client: {
		// mesmo valor de `CLIENT_API_KEY` do servidor (`server.ts`): o próprio frontend do
		// `web` manda este cabeçalho contra o próprio backend (`utils/trpc.ts`, S08
		// estendido). Fica visível no bundle do navegador por natureza de toda variável
		// `NEXT_PUBLIC_*` — trade-off explícito e aceito: é barreira baixa contra
		// curl/acesso programático direto, não segredo forte. Controle de acesso de
		// verdade é o Better Auth (S09/S10), camada separada e adicional.
		NEXT_PUBLIC_CLIENT_API_KEY: z.string().min(1),
	},
	runtimeEnv: {
		NEXT_PUBLIC_CLIENT_API_KEY: process.env.NEXT_PUBLIC_CLIENT_API_KEY,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
