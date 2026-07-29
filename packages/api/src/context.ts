import { db } from "@survey/db";
import { createRepositories } from "@survey/db/repositories/index";
import type { NextRequest } from "next/server";

const repositories = createRepositories(db);

export async function createContext(_req: NextRequest) {
	return {
		auth: null,
		session: null,
		repositories,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
