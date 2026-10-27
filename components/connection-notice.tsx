"use client";

import { useEffect, useState } from "react";

// A Kenyan beta visitor loses signal in the middle of a task. This reports that fact and does
// nothing else: there is no cache, no queue and no retry of anything, so a saved, shortlisted or
// drafted change stays unsent instead of being claimed as done. navigator.onLine only says the
// device has a network interface, so the browser offline event is the trigger and the online
// event only clears the notice.
export function ConnectionNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const markOffline = () => setOffline(true);
    const markOnline = () => setOffline(false);
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markOnline);
    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <p
      role="status"
      className="mb-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-3 text-sm"
    >
      You are offline right now. Nothing has been sent, so saved looks, shortlist picks and drafts
      stay where they are until the connection returns.
    </p>
  );
}
