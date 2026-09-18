"use client";

/**
 * lib/digital-print.ts
 *
 * Styld "digital print" — a privacy-safe, client-side device signature that is
 * recorded with every successful authentication.
 *
 * Design rules:
 *  - No cookies, no storage, no tracking across sites.
 *  - Never collects raw IP (the server derives and hashes it), geolocation,
 *    camera/mic state, or any personally identifying content.
 *  - Produces a stable, non-reversible fingerprint used only for account
 *    security: recognising a trusted device and investigating account takeover.
 *  - Must NEVER throw: authentication must never fail because of telemetry.
 */

export interface DigitalPrint {
  fingerprint: string;
  platform: string;
  language: string;
  timezone: string;
  screen: string;
  hardwareConcurrency: number | null;
  touchPoints: number | null;
  reducedMotion: boolean;
}

/** FNV-1a 32-bit: dependency-free, deterministic, non-reversible in practice. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function captureDigitalPrint(): DigitalPrint | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  try {
    const nav = navigator as Navigator & {
      hardwareConcurrency?: number;
      maxTouchPoints?: number;
    };

    const platform = nav.platform || "unknown";
    const language = nav.language || "unknown";
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
    const screenSummary =
      typeof screen !== "undefined"
        ? `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}`
        : "unknown";

    const reducedMotion =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    const hardwareConcurrency = safeNumber(nav.hardwareConcurrency);
    const touchPoints = safeNumber(nav.maxTouchPoints);

    // Signature excludes volatile values (timestamps, random) so a returning
    // trusted device produces the same fingerprint.
    const signature = [
      platform,
      language,
      timezone,
      screenSummary,
      hardwareConcurrency ?? "na",
      touchPoints ?? "na",
      reducedMotion ? "rm1" : "rm0",
    ].join("|");

    return {
      fingerprint: fnv1a(signature),
      platform,
      language,
      timezone,
      screen: screenSummary,
      hardwareConcurrency,
      touchPoints,
      reducedMotion,
    };
  } catch {
    return null;
  }
}

/**
 * Reports a successful authentication to Styld's digital-print audit trail.
 * Fire-and-forget by design: failures are swallowed so this can never block
 * or break a user's sign-in.
 */
export async function reportDigitalPrint(authMethod: string): Promise<void> {
  try {
    const print = captureDigitalPrint();
    if (!print) return;

    await fetch("/api/auth/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: authMethod, print }),
      keepalive: true,
    });
  } catch {
    // Telemetry must never surface as a user-facing error.
  }
}
