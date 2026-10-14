"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { sanitizePlanContext } from "@/lib/plan-context.cjs";
import { readAppSession } from "@/lib/client-session";
import { professionals, salons, services } from "@/lib/site-data";
import { openGuestGate } from "@/lib/guest-session";

function getServicesByIds(ids: string[]) {
  return ids
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is (typeof services)[number] => Boolean(service));
}

export function AppointmentPlanning() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = readAppSession();
  const targetType = searchParams.get("targetType");
  const targetId = searchParams.get("targetId");
  const serviceIds = (searchParams.get("serviceIds") ?? searchParams.get("serviceId") ?? "")
    .split(",")
    .filter(Boolean);

  const target =
    targetType === "salons" && targetId
      ? salons.find((item) => item.slug === targetId) ?? null
      : targetType === "professionals" && targetId
        ? professionals.find((item) => item.slug === targetId) ?? null
        : null;

  const selectedServices = getServicesByIds(serviceIds);
  const isWorkspaceRole = session?.role === "professional" || session?.role === "salon";
  
  return (
    <AppShell currentNav="book" allowedRoles={["guest", "client", "super_admin", "professional", "salon"]} roleMode="salons">
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6">
        <header className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[0_20px_60px_rgba(29,29,27,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Appointment planning</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-none text-[var(--text-primary)]">
            Understand what would happen next.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            This is a planning preview, not a booking operation. Discovery and comparison remain available without an account. Real appointment times, confirmations, holds or payments are not performed.
          </p>
          {isWorkspaceRole ? (
            <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4 text-sm text-[var(--text-secondary)]">
              You are currently signed in as a {session?.role}. Workspace navigation remains separate, and this page does not convert you into a client booking flow.
            </div>
          ) : null}
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
            <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Selected planning context</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Data below comes only from the URL selected context and catalogue records. Any price or duration is an illustrative catalogue value, not a guaranteed current quote.
            </p>

            {target ? (
              <div className="mt-5 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">
                  {targetType === "salons" ? "Salon identity" : "Professional identity"}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{target.name}</h3>
                {"location" in target && <p className="mt-1 text-sm text-[var(--text-secondary)]">{target.location}</p>}
                {"description" in target && <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{target.description}</p>}
                <p className="mt-3 text-xs text-[var(--text-muted)]">Catalogue sample profile — not verified as an active live provider profile.</p>
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-5">
                <h3 className="font-display text-xl font-semibold text-[var(--text-primary)]">Generic plan preview</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  No valid provider or service selection is present. You can still browse the complete planning screen and return to Discovery or Compare without signing in.
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {selectedServices.length ? (
                selectedServices.map((service) => (
                  <article key={service.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Catalogue service</p>
                    <h3 className="mt-2 font-display text-lg font-semibold text-[var(--text-primary)]">{service.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{service.description}</p>
                    <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                      Catalogue estimate: {service.minPrice === service.maxPrice ? `KES ${service.minPrice}` : `KES ${service.minPrice}-${service.maxPrice}`} · {service.durationMin === service.durationMax ? `${service.durationMin} min` : `${service.durationMin}-${service.durationMax} min`}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">Not verified live price, duration or availability.</p>
                  </article>
                ))
              ) : (
                <div className="col-span-full rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-5">
                  <p className="text-sm text-[var(--text-secondary)]">No services were selected. The planning context can be populated from Discover or Compare.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Next steps without a booking commitment</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  "Review the service description and catalogue estimates.",
                  "Return to Discover or Compare to refine the selection.",
                  "If a genuine supported account action becomes available, sign-in context will be requested then.",
                ].map((step) => (
                  <li key={step} className="flex gap-3 text-[var(--text-secondary)]">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-clay)]" />
                    {step}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">
                BOOKING_COMMITMENTS=false. No appointment is reserved, no booking request is submitted, and no checkout is available in this phase.
              </p>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Contextual sign-in</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Your current session: <span className="font-semibold text-[var(--text-primary)]">{session?.role ?? "guest"}</span>. Sign-in is not required merely to view this planning preview.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {session?.role === "guest" ? (
                  <Link
                    href="/auth/sign-in?returnTo=%2Fbook"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white"
                  >
                    Sign in to an existing STYLD account
                  </Link>
                ) : (
                  <Link
                    href="/auth/preview"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white"
                  >
                    Open valid account preview
                  </Link>
                )}
                <Link
                  href="/auth/sign-in?returnTo=%2Fbook"
                  onClick={() => openGuestGate("booking", "/book")}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]"
                >
                  Contextual sign-in event
                </Link>
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
                The contextual gate preserves only an internal return destination. Do not use browser URLs for sensitive session data.
              </p>
            </section>

            <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Return to browsing</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/discover" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">
                  Discover
                </Link>
                <Link href="/service-comparison" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">
                  Compare
                </Link>
                <Link href="/home" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">
                  Guest home
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
