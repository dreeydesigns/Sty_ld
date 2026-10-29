import Link from "next/link";
import type { ReactNode } from "react";

import { AppUsageTracker } from "@/components/app-usage-tracker";
import { ConnectionNotice } from "@/components/connection-notice";
import { SessionHydrator } from "@/components/session-hydrator";
import { GuestAuthGate } from "@/components/guest-auth-gate";
import type { NavKey, RoleMode } from "@/lib/site-data";
import { ClientSessionGate } from "@/components/client-session-gate";
import { BottomMobileNav, SplitBrandHeader } from "@/components/marketplace-ui";
import type { AppUserRole } from "@/lib/client-session";
import { FEATURES } from "@/lib/feature-flags";
import { OnboardingTour } from "@/components/onboarding-tour";
import { ShortlistTray } from "@/components/shortlist";

export function AppShell({
  children,
  currentNav,
  requireSession = false,
  showBottomNav = true,
  showFooter = false,
  allowedRoles,
  maxWidth = "max-w-7xl",
}: {
  children: ReactNode;
  currentNav: NavKey;
  roleMode?: RoleMode; // kept for backward-compat but no longer used
  requireSession?: boolean;
  showBottomNav?: boolean;
  showFooter?: boolean;
  allowedRoles?: AppUserRole[];
  maxWidth?: string;
}) {
  return (
    <div className="feminine-shell flex min-h-screen w-full max-w-full min-w-0 flex-col bg-transparent text-[var(--text-primary)]">
      <OnboardingTour />
      <AppUsageTracker />
      {/* Restores the display profile from a server-verified HttpOnly session. */}
      <SessionHydrator />
      {/* Guest 10-min timer + booking/checkout gate, renders nothing until triggered */}
      <GuestAuthGate />
      <SplitBrandHeader currentNav={currentNav} />
      
      <main className={`mx-auto flex w-full max-w-full min-w-0 flex-grow flex-col px-4 pt-6 lg:px-6 ${maxWidth}`}>
        <ConnectionNotice />
        {!FEATURES.BOOKING_COMMITMENTS && !requireSession && (
          <p role="status" className="styld-frame-notice mb-4 rounded-xl border border-[var(--border-subtle)] p-3 text-sm">
            Preview: discovery listings, ratings and availability include sample data. They are not proof of provider verification. Bookings, purchases and payments are unavailable.
          </p>
        )}
        {requireSession ? (
          <ClientSessionGate allowedRoles={allowedRoles}>
            {children}
          </ClientSessionGate>
        ) : (
          children
        )}
      </main>
      
      {showFooter ? (
        <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--footer-bg)]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[var(--footer-text)] lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div>
              <p className="font-display text-lg font-semibold text-[var(--footer-text)]">Styld</p>
              <p className="mt-1">Catalogue discovery is available. Live booking and payments are not yet enabled.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/guide" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-[var(--color-warning)]">
                Guide
              </Link>
              {FEATURES.SHOP && (
                <Link href="/counter" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-[var(--color-warning)]">
                  Counter
                </Link>
              )}
              <Link href="/book" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-[var(--color-warning)]">
                Plan
              </Link>
              <Link href="/terms" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-[var(--color-warning)]">
                Terms & Conditions
              </Link>
              <Link href="/help" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-[var(--color-warning)]">
                Help
              </Link>
            </div>
          </div>
        </footer>
      ) : null}
      
      <ShortlistTray />
      {showBottomNav ? <BottomMobileNav currentNav={currentNav} /> : null}
    </div>
  );
}
