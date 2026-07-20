"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clearAppSession } from "@/lib/client-session";

export const SESSION_EXPIRED_EVENT = "ms-session-expired";

/** Dispatch this anywhere to trigger the session-expiry modal. */
export function signalSessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

/**
 * Global modal that appears when the server returns 401 (session cookie
 * expired or invalidated). Gives the user a clear path to re-sign-in
 * without losing their current URL context.
 *
 * Mount once in app/layout.tsx.
 */
export function SessionExpiryModal() {
  const [visible, setVisible] = useState(false);
  const [returnUrl, setReturnUrl] = useState("/home");

  useEffect(() => {
    function handleExpiry() {
      setReturnUrl(window.location.pathname + window.location.search);
      setVisible(true);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiry);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiry);
  }, []);

  function handleSignIn() {
    clearAppSession();
    setVisible(false);
  }

  if (!visible) return null;

  const signInHref = `/auth/sign-in?returnTo=${encodeURIComponent(returnUrl)}`;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(13,27,42,0.22)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500 text-2xl">
          🔒
        </div>
        <h2 className="mt-4 text-xl font-semibold text-[var(--ms-navy)]">Session expired</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">
          Your session has timed out. Sign in again to continue — we&apos;ll bring you right back.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={signInHref}
            onClick={handleSignIn}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ms-plum)] text-sm font-semibold text-white transition hover:brightness-110"
          >
            Sign in again
          </Link>
          <Link
            href="/"
            onClick={() => setVisible(false)}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--ms-border)] text-sm font-semibold text-[var(--ms-navy)] transition hover:border-[var(--ms-navy)]"
          >
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
