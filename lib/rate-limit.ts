/**
 * Styld — in-memory sliding-window rate limiter (defense-in-depth)
 *
 * P0A: abused endpoints (credential-free sign-in, unauthenticated uploads) had no
 * throttling at all. This limiter closes that at the code level.
 *
 * HONEST LIMITS: this is process-local memory. On serverless (Vercel) each
 * instance has its own map, so it throttles a single instance, not the fleet.
 * It is defense-in-depth only — a durable limiter (Redis/Upstash/DB) is a P1 item.
 *
 * `now` is injectable so the behaviour is deterministic in tests; production
 * callers omit it and get `Date.now()`.
 */

export interface RateLimitOptions {
  /** Maximum number of requests allowed inside the window. Default 10. */
  limit?: number;
  /** Window length in milliseconds. Default 60_000. */
  windowMs?: number;
  /** Timestamp in ms to evaluate at. Defaults to `Date.now()`. */
  now?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests still available inside the current window (never negative). */
  remaining: number;
  limit: number;
  windowMs: number;
  /** Milliseconds until the caller may retry (0 when allowed). */
  retryAfterMs: number;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

/** key → ascending timestamps (ms) of recent requests. */
const buckets = new Map<string, number[]>();

/**
 * Record a request for `key` and report whether it is allowed.
 * Never throws: a limiter fault must not take an endpoint down, so an internal
 * error fails closed for the caller only via the returned result.
 */
export function checkRateLimit(key: string, options: RateLimitOptions = {}): RateLimitResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = options.now ?? Date.now();

  const bucketKey = key || "anonymous";
  const cutoff = now - windowMs;
  const recent = (buckets.get(bucketKey) ?? []).filter((timestamp) => timestamp > cutoff);

  if (recent.length >= limit) {
    const oldest = recent[0];
    buckets.set(bucketKey, recent);
    return {
      allowed: false,
      remaining: 0,
      limit,
      windowMs,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  recent.push(now);
  buckets.set(bucketKey, recent);

  return {
    allowed: true,
    remaining: Math.max(0, limit - recent.length),
    limit,
    windowMs,
    retryAfterMs: 0,
  };
}

/**
 * Drop limiter state. Without an argument every key is cleared.
 * Used by tests; also useful for an in-process reset after maintenance.
 */
export function resetRateLimiter(key?: string): void {
  if (key === undefined) {
    buckets.clear();
    return;
  }
  buckets.delete(key);
}

/**
 * Best-effort client key from a request's forwarded headers.
 * Never trusted for authorization — used only to bucket throttling.
 */
export function clientKeyFromHeaders(headers: Headers, scope: string): string {
  const forwarded = headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? "unknown";
  const firstParty = forwarded.split(",")[0]?.trim() || "unknown";
  return `${scope}:${firstParty}`;
}
