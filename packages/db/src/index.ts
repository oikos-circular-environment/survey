import { env } from "@survey/env/server";
import { drizzle } from "drizzle-orm/mysql2";

import { createPool } from "./client";
import * as schema from "./schema";

export function createDb() {
	return drizzle(createPool(env.DATABASE_URL), {
		schema,
		mode: "default",
	});
}

export const db = createDb();
