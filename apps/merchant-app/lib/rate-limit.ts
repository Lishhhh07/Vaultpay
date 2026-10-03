type Entry = { count: number; resetAt: number };

const g = globalThis as unknown as { __rateLimitStore?: Map<string, Entry> };
const store: Map<string, Entry> = (g.__rateLimitStore ??= new Map());

function sweep() {
  if (store.size < 5000) return;
  const now = Date.now();
  store.forEach((v, k) => { if (v.resetAt <= now) store.delete(k); });
}
export function peek(key: string, limit: number) {
  const e = store.get(key);
  if (!e || e.resetAt <= Date.now()) return { limited: false, retryAfterSec: 0 };
  return {
    limited: e.count >= limit,
    retryAfterSec: Math.ceil((e.resetAt - Date.now()) / 1000),
  };
}

export function record(key: string, windowMs: number) {
  sweep();
  const now = Date.now();
  const e = store.get(key);
  if (!e || e.resetAt <= now) store.set(key, { count: 1, resetAt: now + windowMs });
  else e.count += 1;
}

export function clear(key: string) {
  store.delete(key);
}