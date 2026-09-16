/**
 * P0A regression suite — in-memory rate limiter (lib/rate-limit.ts)
 *
 * P0A added throttling to previously unthrottled endpoints (credential-free
 * sign-in, anonymous uploads). The clock is injected so window behaviour is
 * deterministic; no timers are faked and nothing sleeps.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimiter } from "@/lib/rate-limit";

const WINDOW = { limit: 5, windowMs: 60_000 };

describe("in-memory sliding-window rate limiter", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("allows up to max requests per window", () => {
    const t0 = 1_000_000;

    for (let i = 0; i < 5; i += 1) {
      expect(checkRateLimit("caller", { ...WINDOW, now: t0 + i }).allowed).toBe(true);
    }

    const sixth = checkRateLimit("caller", { ...WINDOW, now: t0 + 5 });
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
    expect(sixth.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const t0 = 2_000_000;

    for (let i = 0; i < 5; i += 1) {
      checkRateLimit("caller", { ...WINDOW, now: t0 + i });
    }
    expect(checkRateLimit("caller", { ...WINDOW, now: t0 + 30_000 }).allowed).toBe(false);

    // One millisecond past the 60s window, the earliest request has aged out.
    expect(checkRateLimit("caller", { ...WINDOW, now: t0 + 61_000 }).allowed).toBe(true);
  });

  it("keys are isolated per caller", () => {
    const t0 = 3_000_000;

    for (let i = 0; i < 5; i += 1) {
      checkRateLimit("a", { ...WINDOW, now: t0 + i });
    }

    expect(checkRateLimit("a", { ...WINDOW, now: t0 + 6 }).allowed).toBe(false);
    expect(checkRateLimit("b", { ...WINDOW, now: t0 + 6 }).allowed).toBe(true);
  });
});
