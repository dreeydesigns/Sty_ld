"use client";

import { Suspense, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { GuestHome } from "@/components/guest-home";
import { SocialHome } from "@/components/social-home";
import { ClientRatingFlow } from "@/components/service-session";
import { readAppSession, type AppUserSession } from "@/lib/client-session";

export default function HomePage() {
  const [session, setSession] = useState<AppUserSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      setSession(readAppSession());
      setReady(true);
    }
    sync();
    window.addEventListener("mobile-salon.client-session-change", sync);
    return () => window.removeEventListener("mobile-salon.client-session-change", sync);
  }, []);

  const isGuest = !session || session.role === "guest";

  return (
    <AppShell currentNav="home">
      <ClientRatingFlow />
      {!ready ? (
        <div role="status" className="mt-16 text-center"><div className="loader-bloom mx-auto h-14 w-14" aria-hidden="true" /><p className="mt-5 text-sm font-semibold text-[var(--color-secondary)]">Loading your account.</p></div>
      ) : isGuest ? (
        <GuestHome />
      ) : (
        <Suspense fallback={<div role="status" className="mt-16 text-center"><div className="loader-bloom mx-auto h-14 w-14" aria-hidden="true" /><p className="mt-5 text-sm font-semibold text-[var(--color-secondary)]">Loading your feed.</p></div>}>
          <SocialHome />
        </Suspense>
      )}
    </AppShell>
  );
}
