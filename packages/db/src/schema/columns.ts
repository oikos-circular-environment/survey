/**
 * Colunas compartilhadas pelo schema.
 *
 * Existe para concentrar duas armadilhas do MySQL que o Drizzle não cobre sozinho.
 *
 * **`now()` não herda a precisão da coluna.** Numa coluna `timestamp(3)`, o padrão
 * `DEFAULT (now())` grava sempre com milissegundos zerados, porque `now()` sem
 * argumento devolve precisão de segundo. É preciso `now(3)` explícito. O erro não
 * aparece em nenhum lugar: a coluna aceita o valor, a migração aplica, e só muito
 * depois alguém percebe que todo `created_at` termina em `.000`.
 *
 * **`ON UPDATE CURRENT_TIMESTAMP` precisa casar a precisão.** Numa coluna `timestamp(3)`
 * o MySQL exige `ON UPDATE CURRENT_TIMESTAMP(3)` e rejeita a forma sem argumento com
 * `ER_INVALID_ON_UPDATE`. O `drizzle-kit` emite a cláusula sem precisão e não oferece
 * como mudar isso, então `onUpdateNow()` é inutilizável aqui e a manutenção do
 * `updated_at` fica com o ORM, via `$onUpdate` — todas as escritas passam por ele.
 */

import { sql } from "drizzle-orm";
import { timestamp } from "drizzle-orm/mysql-core";

/** Timestamp em UTC com precisão de milissegundos. */
export function timestampMs(name: string) {
	return timestamp(name, { fsp: 3 });
}

/** Momento atual com milissegundos de verdade, para usar em `.default(...)`. */
export function nowMs() {
	return sql`(now(3))`;
}
