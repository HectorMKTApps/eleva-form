// Brief in-memory cache for read-mostly Sheets-backed config data (Line of
// Business options, Open Positions). Same best-effort caveat as the rate
// limiter: it lives per warm serverless instance, not shared across them —
// good enough to cut down redundant Sheets API calls on bursts of page
// loads without adding a shared store.
const CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function withShortCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const value = await loader();
  store.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}
