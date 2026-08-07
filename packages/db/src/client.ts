/**
 * Construção da conexão com o banco.
 *
 * Existe separado de `index.ts` porque o harness de teste precisa das mesmas garantias
 * de conexão sem herdar a instância única da aplicação.
 *
 * **Por que forçar o fuso da sessão.** O Drizzle converte os dois sentidos assumindo
 * UTC: ao escrever manda `toISOString()`, ao ler interpreta a string do servidor como
 * `+0000`. A ida está certa em qualquer servidor; a volta só está certa se a sessão do
 * MySQL também estiver em UTC. Num servidor com `time_zone` local, uma coluna
 * `timestamp` volta convertida para o fuso do servidor e o Drizzle a rotula como UTC —
 * o instante fica deslocado, sem erro em lugar nenhum. Nosso contêiner de
 * desenvolvimento é UTC por acaso, o que torna esse deslocamento o tipo de coisa que
 * só aparece depois do deploy.
 */

import mysql from "mysql2/promise";

/**
 * Cria o pool com a sessão fixada em UTC.
 *
 * O `SET time_zone` roda a cada conexão nova do pool, e não uma vez: o pool abre e
 * fecha conexões ao longo da vida do processo, e uma conexão nova nasce com o padrão
 * do servidor.
 */
export function createPool(uri: string): mysql.Pool {
	const pool = mysql.createPool({ uri, flags: ["-FOUND_ROWS"] });

	pool.on("connection", (connection) => {
		connection.query("SET time_zone = '+00:00'");
	});

	return pool;
}
