"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import {
  MAX_PLAN_SERVICES,
  filterServicesByCategory,
  planServicePool,
  serviceCategoriesFor,
  summarizePlanSelection,
  toggleServiceSelection,
} from "@/lib/plan-offer.cjs";
import { sanitizePlanContext, resolvePlanContext } from "@/lib/plan-context.cjs";
import {
  clearPlanDraft,
  clearPlanScope,
  choosePlanServiceIds,
  planContextKey,
  planDraftScope,
  readPlanDraft,
  writePlanDraft,
} from "@/lib/plan-draft";
import {
  APP_SESSION_EVENT,
  hasResolvedAppSession,
  readAppSession,
  type AppUserSession,
} from "@/lib/client-session";
import { professionals, salons, services, type Service } from "@/lib/site-data";
import { cn, formatDurationRange, formatPriceRange } from "@/lib/utils";

const primaryAction =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-clay)]";
const secondaryAction =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-clay)]";

export function AppointmentPlanning() {
  const searchParams = useSearchParams();
  const [sessionState, setSessionState] = useState<{ session: AppUserSession | null; resolved: boolean }>(() => ({
    session: readAppSession(),
    resolved: hasResolvedAppSession(),
  }));

  useEffect(() => {
    const sync = () => setSessionState({ session: readAppSession(), resolved: hasResolvedAppSession() });
    sync();
    window.addEventListener(APP_SESSION_EVENT, sync);
    return () => window.removeEventListener(APP_SESSION_EVENT, sync);
  }, []);

  const session = sessionState.session;
  const draftScope = useMemo(() => planDraftScope(session, sessionState.resolved), [session, sessionState.resolved]);

  const rawTargetType = searchParams.get("targetType");
  const rawTargetId = searchParams.get("targetId");
  const rawServiceIds = searchParams.get("serviceIds") ?? searchParams.get("serviceId") ?? "";

  const context = sanitizePlanContext({
    targetType: rawTargetType,
    targetId: rawTargetId,
    serviceIds: rawServiceIds,
  });

  const { mode, provider, services: incomingServices } = resolvePlanContext(context, {
    professionals,
    salons,
    services,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    incomingServices.map((service: Service) => service.id),
  );
  const [selectedCategory, setSelectedCategory] = useState("All");

  const servicePool = useMemo(
    () => planServicePool(mode, provider, services),
    [mode, provider],
  );
  const categories = useMemo(() => serviceCategoriesFor(servicePool), [servicePool]);
  const activeCategory =
    selectedCategory === "All" || categories.includes(selectedCategory) ? selectedCategory : "All";
  const visibleServices = useMemo(
    () => filterServicesByCategory(servicePool, activeCategory),
    [servicePool, activeCategory],
  );

  const selectedServices = useMemo(
    () =>
      selectedIds
        .map((id) => servicePool.find((service: Service) => service.id === id))
        .filter((service): service is Service => Boolean(service)),
    [selectedIds, servicePool],
  );
  const estimate = summarizePlanSelection(selectedServices);
  const selectionAtCap = selectedIds.length >= MAX_PLAN_SERVICES;

  const contextKey = planContextKey({ mode, targetType: context.targetType, targetId: context.targetId });
  const hasExplicitServiceParam = searchParams.has("serviceIds") || searchParams.has("serviceId");
  const explicitSignature = context.serviceIds.join(",");
  const reconcileSignature = `${draftScope ?? "pending"}|${mode}|${contextKey}|${
    hasExplicitServiceParam ? `1:${explicitSignature}` : "0"
  }`;
  const previousScopeRef = useRef<string | null>(null);
  const reconciledRef = useRef<string | null>(null);
  const [reconciledSignature, setReconciledSignature] = useState<string | null>(null);

  useEffect(() => {
    if (!draftScope || reconciledRef.current === reconcileSignature) return;

    const previousScope = previousScopeRef.current;
    previousScopeRef.current = draftScope;

    if (mode === "invalid") {
      setSelectedIds([]);
      reconciledRef.current = reconcileSignature;
      setReconciledSignature(reconcileSignature);
      return;
    }

    const allowedIds = servicePool.map((service: Service) => service.id);
    const explicitIds = explicitSignature ? explicitSignature.split(",") : [];
    const storedIds = hasExplicitServiceParam ? null : readPlanDraft(draftScope, contextKey);
    let selection = choosePlanServiceIds({
      explicit: hasExplicitServiceParam,
      explicitIds,
      draftIds: storedIds,
      allowedIds,
      allowDraft: !hasExplicitServiceParam,
    });

    if (
      !selection.serviceIds.length &&
      !hasExplicitServiceParam &&
      previousScope === null &&
      selectedIds.length > 0
    ) {
      selection = choosePlanServiceIds({
        explicit: true,
        explicitIds: selectedIds,
        allowedIds,
        allowDraft: false,
      });
    }

    setSelectedIds(selection.serviceIds);
    if (selection.serviceIds.length) writePlanDraft(draftScope, contextKey, selection.serviceIds);
    else if (!hasExplicitServiceParam) clearPlanDraft(draftScope, contextKey);

    reconciledRef.current = reconcileSignature;
    setReconciledSignature(reconcileSignature);
  }, [
    draftScope,
    reconcileSignature,
    mode,
    contextKey,
    hasExplicitServiceParam,
    explicitSignature,
    servicePool,
    selectedIds,
  ]);

  useEffect(() => {
    if (!draftScope || reconciledSignature !== reconcileSignature) return;
    if (selectedIds.length === 0) return;
    writePlanDraft(draftScope, contextKey, selectedIds);
  }, [selectedIds, draftScope, contextKey, reconcileSignature, reconciledSignature]);

  const requestedServices = context.serviceIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service));
  const unknownServiceCount = context.serviceIds.length - requestedServices.length;
  const mismatchedServiceCount =
    mode === "provider" && provider
      ? requestedServices.filter((service) => !provider.serviceIds.includes(service.id)).length
      : 0;

  const containmentNotice =
    mismatchedServiceCount > 0
      ? "Some services from your link are not offered by this provider, so we left them out."
      : unknownServiceCount > 0
        ? "Some services from your link were not found, so we left them out."
        : null;

  const hasInvalidProvider = mode === "invalid";
  const profileHref = provider
    ? context.targetType === "salons"
      ? `/salons/${provider.slug}`
      : `/professionals/${provider.slug}`
    : null;
  const exploreParams = new URLSearchParams();
  if (selectedIds.length) exploreParams.set("serviceIds", selectedIds.join(","));
  if (mode === "provider" && context.targetType && context.targetId) {
    exploreParams.set("targetType", context.targetType);
    exploreParams.set("targetId", context.targetId);
  }
  const exploreQuery = exploreParams.toString();
  const exploreSuffix = exploreQuery ? `&${exploreQuery}` : "";
  const discoverHref = exploreQuery ? `/discover?${exploreQuery}` : "/discover";
  const hasPlanState = selectedIds.length > 0 || mode === "provider" || hasExplicitServiceParam;
  const showSignIn = !session || session.role === "guest";

  const toggleService = (serviceId: string) => {
    const next = toggleServiceSelection(selectedIds, serviceId);
    setSelectedIds(next);
    if (draftScope && next.length === 0) clearPlanDraft(draftScope, contextKey);
  };

  const clearPlan = () => {
    setSelectedIds([]);
    if (draftScope) clearPlanScope(draftScope);
  };

  return (
    <AppShell currentNav="book" allowedRoles={["guest", "client", "super_admin", "professional", "salon"]} roleMode="salons">
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6">
        <header
          data-tour="planning-header"
          className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[0_20px_60px_rgba(29,29,27,0.06)] sm:p-8"
        >
          <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.9rem)] font-semibold leading-tight text-[var(--text-primary)]">
            Plan your beauty visit
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Choose a service and see an estimate.
          </p>
          {showSignIn ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Have an account?{" "}
              <Link
                href="/auth/sign-in?returnTo=%2Fbook"
                className="font-semibold text-[var(--text-primary)] underline decoration-[var(--color-clay)] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-clay)]"
              >
                Sign in
              </Link>
            </p>
          ) : null}
        </header>

        {hasInvalidProvider ? (
          <section className="mt-6 rounded-[30px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
            <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
              That selection could not be matched
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Start a new plan or browse Discover.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/book" className={primaryAction}>
                Start a new plan
              </Link>
              <Link href="/discover" className={secondaryAction}>
                Open Discover
              </Link>
            </div>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
            <section
              aria-labelledby="plan-step-choose"
              className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Step 1</p>
              <h2 id="plan-step-choose" className="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">
                Choose a service
              </h2>

              {provider ? (
                <div className="mt-4 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">
                    {context.targetType === "salons" ? "Salon" : "Professional"}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-[var(--text-primary)]">{provider.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{provider.location}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Sample catalogue profile.</p>
                </div>
              ) : null}

              {containmentNotice ? (
                <p className="mt-4 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {containmentNotice}
                </p>
              ) : null}

              <div role="group" aria-label="Service categories" className="mt-5 flex flex-wrap gap-2">
                {["All", ...categories].map((category) => (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={activeCategory === category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-clay)]",
                      activeCategory === category
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                        : "border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--color-clay)]",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div role="group" aria-label="Services" className="mt-4 grid gap-3 sm:grid-cols-2">
                {visibleServices.map((service: Service) => {
                  const selected = selectedIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={!selected && selectionAtCap}
                      onClick={() => toggleService(service.id)}
                      className={cn(
                        "flex min-h-11 w-full flex-col items-start gap-1 rounded-[22px] border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-clay)] disabled:cursor-not-allowed disabled:opacity-50",
                        selected
                          ? "border-[var(--color-ink)] bg-[var(--bg-surface-raised)]"
                          : "border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--color-clay)]",
                      )}
                    >
                      <span className="font-display text-base font-semibold text-[var(--text-primary)]">{service.name}</span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {formatPriceRange(service.minPrice, service.maxPrice)}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatDurationRange(service.durationMin, service.durationMax)}
                      </span>
                      <span className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-clay-text)]">
                        {selected ? "Selected" : "Add to estimate"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectionAtCap ? (
                <p className="mt-3 text-xs text-[var(--text-muted)]">You can choose up to {MAX_PLAN_SERVICES} services.</p>
              ) : null}
            </section>

            <aside className="space-y-6">
              <section
                aria-labelledby="plan-step-estimate"
                className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Step 2</p>
                    <h2 id="plan-step-estimate" className="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">
                      Your estimate
                    </h2>
                  </div>
                  {hasPlanState ? (
                    <Link
                      href="/book"
                      onClick={clearPlan}
                      className="mt-1 shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] underline decoration-[var(--color-clay)] underline-offset-4 transition hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-clay)]"
                    >
                      Clear plan
                    </Link>
                  ) : null}
                </div>

                {estimate ? (
                  <>
                    <ul className="mt-4 space-y-3">
                      {selectedServices.map((service) => (
                        <li
                          key={service.id}
                          className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3 last:border-b-0 last:pb-0"
                        >
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{service.name}</span>
                          <span className="text-right text-sm text-[var(--text-secondary)]">
                            {formatPriceRange(service.minPrice, service.maxPrice)}
                            <span className="block text-xs text-[var(--text-muted)]">
                              {formatDurationRange(service.durationMin, service.durationMax)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 rounded-[20px] bg-[var(--bg-surface-raised)] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">
                        Illustrative total
                      </p>
                      <p className="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">
                        {formatPriceRange(estimate.minTotal, estimate.maxTotal)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {formatDurationRange(estimate.durationMin, estimate.durationMax)}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                    Pick a service to see an estimate.
                  </p>
                )}

                <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
                  Preview only. Prices are estimates. Booking is not available yet.
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  Your plan stays in this tab while you browse.
                </p>
              </section>

              <section
                aria-labelledby="plan-step-explore"
                className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Step 3</p>
                <h2 id="plan-step-explore" className="mt-2 font-display text-2xl font-semibold text-[var(--text-primary)]">
                  Explore your options
                </h2>
                <div className="mt-4 flex flex-col gap-3">
                  {provider && profileHref ? (
                    <Link href={profileHref} className={primaryAction}>
                      View {provider.name}
                    </Link>
                  ) : null}
                  <Link href={`/discover?tab=professionals${exploreSuffix}`} className={secondaryAction}>
                    Browse professionals
                  </Link>
                  <Link href={`/discover?tab=salons${exploreSuffix}`} className={secondaryAction}>
                    Browse salons
                  </Link>
                  <Link
                    href={discoverHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[var(--text-primary)] underline decoration-[var(--color-clay)] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-clay)]"
                  >
                    Open Discover
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
