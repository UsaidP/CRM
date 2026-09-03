/**
 * Database operation retry helper with exponential backoff for Supabase pooler cold starts.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 500
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const isConnectionError =
        err?.code === 'P1001' || // Can't reach database server
        err?.code === 'P1002' || // Database server was reached but timed out
        err?.code === 'P1008' || // Operations timed out
        err?.message?.includes("Can't reach database server") ||
        err?.message?.includes('connection') ||
        err?.message?.includes('timeout') ||
        err?.message?.includes('ECONNREFUSED') ||
        err?.message?.includes('ETIMEDOUT');

      if (!isConnectionError || attempt > retries) {
        throw err;
      }

      console.warn(`[DB Connection Retry] Transient error on attempt ${attempt}/${retries}. Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 1.5;
    }
  }
  throw lastError;
}
