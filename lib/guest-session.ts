/**
 * Guest session gating utilities — INACTIVITY-based timer.
 *
 * Guests browse freely. After INACTIVITY_TIMEOUT_MS (30 min) of no
 * interaction (scroll, click, keypress, touch), the gate fires and they must
 * sign in or create an account to continue.
 *
 * When a guest hits a protected action (booking, checkout) the gate fires
 * immediately and we save a return URL so the user lands back where they were
 * after authenticating.
 *
 * The saved return URL expires INACTIVITY_TIMEOUT_MS after the gate opened.
 * If the user takes longer than 30 min to sign in, cart / booking state is
 * stale — we send them home.
 *
 * Activity tracking is set up in GuestAuthGate via recordGuestActivity().
 * This file only manages storage + event dispatch.
 */

// ── Storage keys ──────────────────────────────────────────────────────────────

const LAST_ACTIVITY_KEY = "ms-guest.last-activity.v1";
const RETURN_URL_KEY     = "ms-guest.return-url.v1";
const GATE_OPENED_KEY    = "ms-guest.gate-opened.v1";

// ── DOM event name ────────────────────────────────────────────────────────────

export const GUEST_GATE_EVENT = "mobile-salon.guest-gate";

export type GuestGateReason =
  | "timeout"        // 10-min browse timeout — non-dismissable
  | "idle-timeout"   // alias used in modal copy (same behaviour as timeout)
  | "booking"        // tried to book without a session
  | "checkout"       // tried to checkout without a session
  | "session-expired"; // session was cleared externally

// ── Config ────────────────────────────────────────────────────────────────────

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

function canUse(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

// ── Activity tracking ─────────────────────────────────────────────────────────

/**
 * Call this on every user interaction (scroll, click, keypress, touch).
 * Sets the last-activity timestamp so the 10-min inactivity clock resets.
 * Should be called from GuestAuthGate's activity event listeners.
 */
export function recordGuestActivity(): void {
  if (!canUse()) return;
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

/**
 * Returns true if the guest has been inactive for > 10 minutes.
 * If no activity has ever been recorded, treat it as just-active (false).
 */
export function isGuestInactiveTimedOut(): boolean {
  if (!canUse()) return false;
  const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  if (!last) return false; // No record yet — first visit, not timed out
  return Date.now() - last > INACTIVITY_TIMEOUT_MS;
}

/** Clear the inactivity timestamp (call when a real session is created). */
export function clearGuestActivity(): void {
  if (!canUse()) return;
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

// ── Return URL (where to send user after auth) ────────────────────────────────

/** Save the URL where the gate was triggered so we return there after auth. */
export function saveGuestReturn(url: string): void {
  if (!canUse()) return;
  localStorage.setItem(RETURN_URL_KEY, url);
  localStorage.setItem(GATE_OPENED_KEY, String(Date.now()));
}

/**
 * Get the saved return URL.
 * Returns null if not set or if > 10 min have passed since the gate opened.
 * (At that point Zustand store state is stale — send user home instead.)
 */
export function getGuestReturn(): string | null {
  if (!canUse()) return null;
  const url    = localStorage.getItem(RETURN_URL_KEY);
  if (!url) return null;
  const opened = Number(localStorage.getItem(GATE_OPENED_KEY));
  if (opened > 0 && Date.now() - opened > INACTIVITY_TIMEOUT_MS) {
    clearGuestReturn();
    return null;
  }
  return url;
}

/** Clear the saved return URL (call after navigating there). */
export function clearGuestReturn(): void {
  if (!canUse()) return;
  localStorage.removeItem(RETURN_URL_KEY);
  localStorage.removeItem(GATE_OPENED_KEY);
}

// ── Gate trigger ──────────────────────────────────────────────────────────────

/**
 * Fire the guest auth gate from anywhere.
 * Pass returnUrl when triggering from a booking/checkout action so the
 * user lands back where they left off after signing in.
 */
export function openGuestGate(
  reason: GuestGateReason,
  returnUrl?: string,
): void {
  if (!canUse()) return;
  if (returnUrl) saveGuestReturn(returnUrl);
  window.dispatchEvent(
    new CustomEvent<{ reason: GuestGateReason }>(GUEST_GATE_EVENT, {
      detail: { reason },
    }),
  );
}
