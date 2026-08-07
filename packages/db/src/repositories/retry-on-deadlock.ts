const DEADLOCK_ERRNOS = new Set([1213, 1205]);

function isDeadlock(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const errno = (error as { errno?: unknown }).errno;
	if (typeof errno === "number" && DEADLOCK_ERRNOS.has(errno)) return true;
	return (error as { code?: unknown }).code === "ER_LOCK_DEADLOCK";
}

/**
 * Reexecuta `fn` quando o MySQL abortar a transação por deadlock ou por estouro do
 * lock wait timeout. O upsert de checkpoint é curto o bastante para ser reexecutado;
 * a única perda numa tentativa falha é a transação abortada.
 */
export async function retryOnDeadlock<T>(fn: () => Promise<T>): Promise<T> {
	const backoffMs = [25, 50];
	let lastError: unknown;
	for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (attempt < backoffMs.length && isDeadlock(error)) {
				await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
				continue;
			}
			throw error;
		}
	}
	throw lastError;
}
