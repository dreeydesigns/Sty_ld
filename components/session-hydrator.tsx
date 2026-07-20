"use client";

/**
 * SessionHydrator
 *
 * Bridges the server-side httpOnly session cookie with the client-side
 * localStorage session store. Runs once on mount. If the localStorage
 * session is missing (e.g. after clearing storage or opening a new device),
 * calls GET /api/me to restore the session from the cookie.
 *
 * This ensures a signed-in user is never shown as logged out just because
 * they cleared localStorage or opened the app in a fresh tab.
 */

import { useEffect } from "react";
import { readAppSession, writeAppSession, createSessionForRole } from "@/lib/client-session";

export function SessionHydrator() {
  useEffect(() => {
    const existing = readAppSession();
    // Only attempt rehydration if the user appears to be a guest / unauthenticated
    if (existing && existing.role !== "guest") return;

    fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { ok: boolean; user?: { id: string; role: string; phone: string; firstName?: string } }) => {
        if (!data.ok || !data.user) return;
        const { id, role, phone, firstName } = data.user;
        const validRole = (["client", "salon", "professional", "shop", "delivery", "super_admin", "team_member"] as const).includes(
          role as never
        );
        if (!validRole) return;
        // Build a minimal session stub; the profile page will fill in the rest
        const stub = createSessionForRole(role as "client" | "salon" | "professional" | "shop" | "delivery" | "super_admin" | "team_member", phone);
        writeAppSession({ ...stub, id, phone, ...(firstName ? { firstName } : {}) } as typeof stub);
      })
      .catch(() => {
        // Network error or no cookie — stay as guest
      });
  }, []);

  return null;
}
