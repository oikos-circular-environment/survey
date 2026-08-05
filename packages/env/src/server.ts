import { createEnv } from "@t3-oss/env-core";
import { config } from "dotenv";
import { z } from "zod";

config({
	path: new URL("../../../apps/web/.env.local", import.meta.url).pathname,
});

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		CORS_ORIGIN: z.url(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		// chave de cliente global de toda procedure tRPC (S08/A5 estendido) — o
		// mobile e o próprio frontend do `web` mandam este valor no cabeçalho
		// `x-client-key`; barreira baixa contra curl/acesso programático direto,
		// não segredo forte (ver `lib/client-key.ts`)
		CLIENT_API_KEY: z.string().min(1),
		// assina cookie/token de sessão do Better Auth (S09/A9)
		BETTER_AUTH_SECRET: z.string().min(1),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
