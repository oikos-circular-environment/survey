/**
 * Pré-carga dos testes: publica as variáveis de ambiente antes de qualquer import.
 *
 * O `.env` do repositório mora em `apps/web`, não na raiz, então o carregamento
 * automático do Bun — que olha só o diretório corrente — não alcança quem roda os
 * testes de dentro de `packages/db`. O caminho é resolvido a partir deste arquivo, e
 * não do processo, para que o resultado não dependa de onde `bun test` foi chamado.
 *
 * Na integração contínua as variáveis já vêm do ambiente; `dotenv` não sobrescreve o
 * que existe, então o arquivo ausente é um caso normal e silencioso.
 */

import { config } from "dotenv";

config({
	path: new URL("../../../../apps/web/.env", import.meta.url).pathname,
});
