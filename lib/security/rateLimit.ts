// In-memory, best-effort rate limiting and idempotency guard.
// Serverless instances are ephemeral and can scale to multiple concurrent
// instances, so this is a basic deterrent (per §12 of the spec), not a
// hard guarantee — sufficient for now, with room to swap in a shared store
// (e.g. Redis) later if spam becomes a real problem.

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const IDEMPOTENCY_TTL_MS = 30_000;

const requestLog = new Map<string, number[]>();
const idempotencyKeys = new Map<string, number>();

function pruneOld(map: Map<string, number>, ttlMs: number, now: number) {
  for (const [key, timestamp] of map) {
    if (now - timestamp > ttlMs) {
      map.delete(key);
    }
  }
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

export function isDuplicateSubmission(idempotencyKey: string): boolean {
  const now = Date.now();
  pruneOld(idempotencyKeys, IDEMPOTENCY_TTL_MS, now);

  if (idempotencyKeys.has(idempotencyKey)) {
    return true;
  }
  idempotencyKeys.set(idempotencyKey, now);
  return false;
}
