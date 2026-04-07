/**
 * Waits for an exponentially increasing delay with ±20% jitter.
 *
 * @param attempt  Zero-based attempt index (0 = first retry)
 * @param baseMs   Base delay in milliseconds (default 1000)
 * @param maxMs    Cap on the delay (default 30_000)
 */
export async function exponentialBackoff(
  attempt: number,
  baseMs = 1000,
  maxMs = 30_000,
): Promise<void> {
  const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  const jitter = delay * 0.2 * (Math.random() * 2 - 1); // ±20%
  await sleep(Math.round(delay + jitter));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
