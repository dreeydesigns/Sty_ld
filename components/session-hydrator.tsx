"use client";
import { useEffect } from "react";
import { clearAppSession, readAppSession, writeAppSession, type AppUserSession } from "@/lib/client-session";

export function SessionHydrator() {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          const existing = readAppSession();
          if (existing && existing.role !== "guest") clearAppSession();
          return;
        }
        if (!response.ok) return;
        const data = await response.json() as { ok: boolean; user?: AppUserSession };
        if (data.ok && data.user) writeAppSession(data.user);
      }).catch(() => { /* Leave cached data untouched during network failures. */ });
    return () => controller.abort();
  }, []);
  return null;
}
