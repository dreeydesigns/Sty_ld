"use client";

/**
 * /dashboard — Smart role-aware redirect.
 *
 * The old page showed hardcoded demo data (njeri-kamau, fake requests).
 * Every role now lands in its correct live workspace:
 *
 *   client       → /profile
 *   professional → /profile?tab=requests
 *   salon        → /profile?tab=requests
 *   shop         → /shop/dashboard
 *   delivery     → /delivery/dashboard
 *   super_admin  → /admin
 *   guest / none → /auth/sign-in?returnTo=/profile
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_SESSION_EVENT, readAppSession } from "@/lib/client-session";
import { getRoleHomeHref } from "@/lib/role-permissions";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    function doRedirect() {
      const session = readAppSession();
      if (!session) {
        router.replace("/auth/sign-in?returnTo=/profile");
        return;
      }
      if (session.role === "professional" || session.role === "salon") {
        router.replace("/profile?tab=requests");
        return;
      }
      if (session.role === "super_admin") {
        router.replace("/admin");
        return;
      }
      if (session.role === "client") {
        router.replace("/profile");
        return;
      }
      // shop / delivery
      router.replace(getRoleHomeHref(session.role));
    }

    doRedirect();
    window.addEventListener(APP_SESSION_EVENT, doRedirect);
    return () => window.removeEventListener(APP_SESSION_EVENT, doRedirect);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="loader-bloom h-14 w-14" aria-hidden="true" />
      {/* This page only decides which workspace to open, and that decision needs the stored
          session, so a visitor without JavaScript has to be told what is happening rather than
          watch a silent spinner. No destination is named because none is known yet. */}
      <p role="status" className="text-sm text-[var(--text-secondary)]">Taking you to your workspace.</p>
      {/* The decision above runs in the browser, so without JavaScript the sentence would be a
          promise this page cannot keep. Middleware already turned a guest away, which means anyone
          reading it is signed in and can take the way out by hand. */}
      <Link href="/home" className="text-sm font-semibold underline">Open your feed</Link>
    </div>
  );
}
