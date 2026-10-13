"use client";
import { useEffect } from "react";
import { clearAppSession, writeVerifiedAppSession, type AppUserSession } from "@/lib/client-session";

export function SessionHydrator() {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          clearAppSession();
          return;
        }
        if (!response.ok) { clearAppSession(); return; }
        const data = await response.json() as { ok: boolean; user?: AppUserSession };
        if (data.ok && data.user) writeVerifiedAppSession(data.user);
      }).catch(() => { if (!controller.signal.aborted) clearAppSession(); });
    return () => controller.abort();
  }, []);
  return null;
}
