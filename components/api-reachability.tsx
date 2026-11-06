"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type State = "checking" | "reachable" | "offline" | "unavailable";
const messages: Record<State, string> = {
  checking: "Checking your connection to STYLD.",
  reachable: "STYLD is reachable from this browser.",
  offline: "Your browser appears offline. Connect, then retry.",
  unavailable: "STYLD could not be reached from this browser. Please retry.",
};

export function ApiReachability() {
  const [state, setState] = useState<State>("checking");
  const active = useRef<AbortController | null>(null);
  const check = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    if (!navigator.onLine) { setState("offline"); return; }
    setState("checking");
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("/api/health", { cache: "no-store", signal: controller.signal });
      const body: unknown = response.ok ? await response.json() : null;
      const valid = typeof body === "object" && body !== null && "ok" in body && body.ok === true && "service" in body && body.service === "styld-api";
      if (active.current === controller) setState(valid ? "reachable" : "unavailable");
    } catch {
      if (active.current === controller) setState(navigator.onLine ? "unavailable" : "offline");
    } finally { window.clearTimeout(timeout); }
  }, []);
  useEffect(() => {
    void check();
    return () => { const controller = active.current; active.current = null; controller?.abort(); };
  }, [check]);
  return <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-5" aria-label="Connection to STYLD">
    <p role="status" aria-live="polite">{messages[state]}</p>
    <button type="button" onClick={() => void check()} disabled={state === "checking"} className="min-h-11 rounded-xl bg-[var(--color-primary)] px-5 py-2 text-[var(--text-inverse)] disabled:opacity-60">Retry</button>
  </section>;
}
