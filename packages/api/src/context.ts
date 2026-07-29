import { db } from "@oikos-circular-environment/survey-db";
import { createRepositories } from "@oikos-circular-environment/survey-db/repositories/index";
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
