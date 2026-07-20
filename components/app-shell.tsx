import Link from "next/link";
import type { ReactNode } from "react";

import { AppUsageTracker } from "@/components/app-usage-tracker";
import { SessionHydrator } from "@/components/session-hydrator";
import { GuestAuthGate } from "@/components/guest-auth-gate";
import type { NavKey, RoleMode } from "@/lib/site-data";
import { ClientSessionGate } from "@/components/client-session-gate";
import { BottomMobileNav, SplitBrandHeader } from "@/components/marketplace-ui";
import type { AppUserRole } from "@/lib/client-session";
import { FEATURES } from "@/lib/feature-flags";

export function AppShell({
  children,
  currentNav,
  requireSession = false,
  showBottomNav = true,
  showFooter = false,
  allowedRoles,
}: {
  children: ReactNode;
  currentNav: NavKey;
  roleMode?: RoleMode; // kept for backward-compat but no longer used
  requireSession?: boolean;
  showBottomNav?: boolean;
  showFooter?: boolean;
  allowedRoles?: AppUserRole[];
}) {
  return (
    <div className="feminine-shell flex min-h-screen flex-col">
      <AppUsageTracker />
      {/* Restores localStorage session from httpOnly cookie if storage was cleared */}
      <SessionHydrator />
      {/* Guest 10-min timer + booking/checkout gate — renders nothing until triggered */}
      <GuestAuthGate />
      <SplitBrandHeader currentNav={currentNav} />
      
      <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col px-4 pt-6 lg:px-6">
        {requireSession ? (
          <ClientSessionGate allowedRoles={allowedRoles}>
            {children}
          </ClientSessionGate>
        ) : (
          children
        )}
      </main>
      
      {showFooter ? (
        <footer className="mt-auto border-t border-[var(--ms-border)] bg-white/90">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[var(--ms-mauve)] lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div>
              <p className="font-semibold text-[var(--ms-navy)]">Mobile Salon</p>
              <p className="mt-1">Beauty in your fingertips. Clear, trusted booking across Nairobi.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/guide" className="hover:text-[var(--ms-navy)]">
                Guide
              </Link>
              {FEATURES.SHOP && (
                <Link href="/counter" className="hover:text-[var(--ms-navy)]">
                  Counter
                </Link>
              )}
              <Link href="/book" className="hover:text-[var(--ms-navy)]">
                Book
              </Link>
              <Link href="/terms" className="hover:text-[var(--ms-navy)]">
                Terms & Conditions
              </Link>
              <Link href="/help" className="hover:text-[var(--ms-navy)]">
                Help
              </Link>
            </div>
          </div>
        </footer>
      ) : null}
      
      {showBottomNav ? <BottomMobileNav currentNav={currentNav} /> : null}
    </div>
  );
}