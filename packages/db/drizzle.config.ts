import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path: "../../apps/web/.env",
});

export default defineConfig({
	// Aponta para o barrel, e não para a pasta: varrer o diretório arrastaria também os
	// arquivos de teste vizinhos, que importam `bun:test` e não resolvem fora do Bun.
	schema: "./src/schema/index.ts",
	out: "./src/migrations",
	dialect: "mysql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "",
	},
});
