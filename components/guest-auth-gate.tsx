"use client";

/**
 * GuestAuthGate — single component used for ALL auth walls:
 *   • 10-minute inactivity timeout     → reason: "idle-timeout"
 *   • Booking without a session        → reason: "booking"
 *   • Checkout without a session       → reason: "checkout"
 *   • Session cleared externally       → reason: "session-expired"
 *
 * Per spec:
 *   - Slides up from bottom on mobile, centres as overlay on desktop
 *   - "booking" / "checkout" gates are dismissable (user can keep browsing)
 *   - "idle-timeout" / "session-expired" gates are NOT dismissable
 *   - After auth: user returns exactly where they were (or role default)
 *   - Activity listeners (scroll/click/key/touch) reset the inactivity clock
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  Clock,
  LockKeyhole,
  ShoppingBag,
  X,
} from "lucide-react";

import {
  clearGuestActivity,
  clearGuestReturn,
  getGuestReturn,
  GUEST_GATE_EVENT,
  INACTIVITY_TIMEOUT_MS,
  isGuestInactiveTimedOut,
  openGuestGate,
  recordGuestActivity,
  type GuestGateReason,
} from "@/lib/guest-session";
import { APP_SESSION_EVENT, readAppSession } from "@/lib/client-session";
import { SignInRolePicker, SignUpRolePicker } from "@/components/role-picker-ui";
import { cn } from "@/lib/utils";

// ── Poll interval — how often we check inactivity ─────────────────────────────

const POLL_MS = 30_000; // 30 s — well within the 5-min cache TTL

// ── Per-reason copy (spec §1.3) ───────────────────────────────────────────────

const REASON_COPY: Record<
  GuestGateReason,
  {
    icon: typeof LockKeyhole;
    heading: string;
    sub: string;
    defaultTab: "sign-in" | "sign-up";
    dismissable: boolean;
  }
> = {
  "idle-timeout": {
    icon: Clock,
    heading: "Still there?",
    sub: "You've been inactive for 10 minutes. Sign in to keep going — your browsing context is saved.",
    defaultTab: "sign-up",
    dismissable: false,
  },
  // "timeout" is kept as an alias so existing callsites don't break
  timeout: {
    icon: Clock,
    heading: "Still there?",
    sub: "You've been inactive for 10 minutes. Sign in to keep going — your browsing context is saved.",
    defaultTab: "sign-up",
    dismissable: false,
  },
  booking: {
    icon: CalendarCheck,
    heading: "Sign in to confirm your booking",
    sub: "Create a free account or sign in to secure your selected service. Your booking details are saved.",
    defaultTab: "sign-in",
    dismissable: true,
  },
  checkout: {
    icon: ShoppingBag,
    heading: "Sign in to complete your purchase",
    sub: "Sign in or create an account to checkout. Your cart is still there waiting for you.",
    defaultTab: "sign-in",
    dismissable: true,
  },
  "session-expired": {
    icon: LockKeyhole,
    heading: "Your session ended. Sign in to continue.",
    sub: "For your security we cleared your session. Sign back in and we'll return you to where you were.",
    defaultTab: "sign-in",
    dismissable: false,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function GuestAuthGate() {
  const router  = useRouter();
  const [open,   setOpen]   = useState(false);
  const [reason, setReason] = useState<GuestGateReason>("idle-timeout");
  const [tab,    setTab]    = useState<"sign-in" | "sign-up">("sign-in");

  // Mirror current pathname without a router dep in event handlers
  const pathnameRef = useRef(
    typeof window !== "undefined" ? window.location.pathname : "/home",
  );
  useEffect(() => {
    pathnameRef.current = window.location.pathname;
  });

  // ── Activity listeners — reset inactivity clock on any interaction ──────────
  useEffect(() => {
    function onActivity() {
      recordGuestActivity();
    }
    const opts = { passive: true } as const;
    window.addEventListener("mousemove",  onActivity, opts);
    window.addEventListener("keydown",    onActivity, opts);
    window.addEventListener("click",      onActivity, opts);
    window.addEventListener("touchstart", onActivity, opts);
    window.addEventListener("scroll",     onActivity, { ...opts, capture: true });
    // Record first activity immediately so the clock starts
    recordGuestActivity();
    return () => {
      window.removeEventListener("mousemove",  onActivity);
      window.removeEventListener("keydown",    onActivity);
      window.removeEventListener("click",      onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("scroll",     onActivity, { capture: true } as EventListenerOptions);
    };
  }, []);

  // ── Inactivity poll — every 30 s, check if guest has been idle > 10 min ─────
  useEffect(() => {
    const id = setInterval(() => {
      if (!readAppSession() && !open && isGuestInactiveTimedOut()) {
        openGuestGate("idle-timeout");
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [open]);

  // ── Listen for gate trigger events (from anywhere in the app) ───────────────
  useEffect(() => {
    function onGate(e: Event) {
      const { reason: r } = (e as CustomEvent<{ reason: GuestGateReason }>).detail;
      setReason(r);
      setTab(REASON_COPY[r].defaultTab);
      setOpen(true);
    }
    window.addEventListener(GUEST_GATE_EVENT, onGate as EventListener);
    return () => window.removeEventListener(GUEST_GATE_EVENT, onGate as EventListener);
  }, []);

  // ── Close + redirect when a session is created ──────────────────────────────
  useEffect(() => {
    function onSession() {
      if (!readAppSession()) return;
      setOpen(false);
      clearGuestActivity();
      const returnUrl = getGuestReturn();
      clearGuestReturn();
      router.push(returnUrl ?? pathnameRef.current);
    }
    window.addEventListener(APP_SESSION_EVENT, onSession);
    return () => window.removeEventListener(APP_SESSION_EVENT, onSession);
  }, [router]);

  // ── Auth success handler passed down to both pickers ────────────────────────
  function handleAuthSuccess(roleDefault: string) {
    const returnUrl = getGuestReturn();
    clearGuestReturn();
    clearGuestActivity();
    setOpen(false);
    router.push(returnUrl ?? roleDefault);
  }

  const copy       = REASON_COPY[reason];
  const dismissable = copy.dismissable;
  const IconComp   = copy.icon;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9990] bg-[rgba(13,27,42,0.60)] backdrop-blur-sm"
            onClick={dismissable ? () => setOpen(false) : undefined}
          />

          {/* Sheet — slides up on mobile, centred on desktop */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[9999] mx-auto w-full max-w-lg overflow-y-auto",
              "rounded-t-[32px] bg-white p-6 shadow-[0_-12px_60px_rgba(13,27,42,0.22)]",
              "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "sm:rounded-[32px] sm:p-8",
            )}
            style={{ maxHeight: "92dvh" }}
          >
            {/* Drag handle (mobile) */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--ms-border)] sm:hidden" />

            {/* Dismiss button */}
            {dismissable && (
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)] transition hover:text-[var(--ms-navy)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ms-petal)] text-[var(--ms-rose)]">
                <IconComp className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">
                  Mobile Salon
                </p>
                <h2 className="text-xl font-semibold leading-tight text-[var(--ms-plum)]">
                  {copy.heading}
                </h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ms-mauve)]">{copy.sub}</p>

            {/* Sign-in / Sign-up tab toggle */}
            <div className="mt-5 flex gap-1.5 rounded-full border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-1">
              <button
                type="button"
                onClick={() => setTab("sign-in")}
                className={cn(
                  "flex-1 rounded-full py-2 text-sm font-semibold transition",
                  tab === "sign-in"
                    ? "bg-[var(--ms-plum)] text-white shadow"
                    : "text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]",
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setTab("sign-up")}
                className={cn(
                  "flex-1 rounded-full py-2 text-sm font-semibold transition",
                  tab === "sign-up"
                    ? "bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-white shadow"
                    : "text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]",
                )}
              >
                Create account
              </button>
            </div>

            {/* Auth pickers */}
            <div className="mt-5">
              {tab === "sign-in" ? (
                <SignInRolePicker
                  returnTo={getGuestReturn() ?? pathnameRef.current}
                  onSuccess={handleAuthSuccess}
                />
              ) : (
                <SignUpRolePicker onSuccess={handleAuthSuccess} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
