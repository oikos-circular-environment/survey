import { createAuthClient } from "better-auth/react";

/**
 * Cliente do Better Auth (S09/S10). Sem `baseURL`: o servidor de autenticação é o
 * próprio `web`, na mesma origem (`/api/auth/[...all]`).
 */
export const authClient = createAuthClient();
