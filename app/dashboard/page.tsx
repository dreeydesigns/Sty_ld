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
    <div className="flex min-h-screen items-center justify-center">
      <div className="loader-bloom h-14 w-14" />
    </div>
  );
}
