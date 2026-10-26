"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { APP_SESSION_EVENT, hasResolvedAppSession, readAppSession } from "@/lib/client-session";
import { planDraftScope, planContextKey, readPlanDraft, writePlanDraft } from "@/lib/plan-draft";
import { sanitizePlanContext, resolvePlanContext } from "@/lib/plan-context.cjs";
import { services as catalogue, professionals, salons } from "@/lib/site-data";
import { planClient, identityFor, listen } from "@/components/plan-state";
import { emptyPlanFields, emptySavedPlan, supportedPlanModes, type PlanData, type PlanFields, type PlanService, type PlanCreator, type PlanLook } from "@/lib/plan-v2";
import { isUuid } from "@/lib/look-contract";
import { cn } from "@/lib/utils";
import { formatListedPrice, listedPriceInCents } from "@/lib/plan-offer.cjs";
import { PlanEstimate } from "@/components/plan-estimate";

const secondary = "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50";
const inputStyle = "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]";
const catalogueOptions: PlanService[] = catalogue.map((service) => ({ id: service.id, name: service.name, workspaceId: null, price: null, category: service.category, modes: [] }));

async function guestData(lookId: string | null, creatorId: string | null): Promise<PlanData> {
  const response = await fetch("/api/services");
  if (!response.ok) throw new Error();
  const payload = await response.json();
  const services: PlanService[] = [...catalogueOptions, ...(Array.isArray(payload.services) ? payload.services : []).filter((row: { id?: string }) => row.id && isUuid(row.id)).map((row: { id: string; name: string; price: number; category: string }) => ({
    id: row.id, name: row.name, price: listedPriceInCents(row.price) !== null ? Number(row.price) : null, workspaceId: null, category: row.category || "Services", modes: [],
  }))];
  let handoff: PlanData["handoff"] = null;
  if (lookId) {
    const postResponse = await fetch(`/api/social/posts/${lookId}`);
    const post = postResponse.ok ? (await postResponse.json()).post : null;
    if (post?.look && (!creatorId || post.look.authorWorkspaceId === creatorId)) {
      const creatorResponse = await fetch(`/api/creators/${post.look.authorWorkspaceId}`);
      const profile = creatorResponse.ok ? (await creatorResponse.json()).creator : null;
      if (profile) {
        const creator: PlanCreator = { workspaceId: post.look.authorWorkspaceId, displayName: profile.displayName || "Creator", modes: supportedPlanModes(profile.serviceMode) };
        const look: PlanLook = { postId: post.id, creatorWorkspaceId: creator.workspaceId, serviceId: post.look.serviceId,
          thumbnailUrl: post.look.mediaUrls?.[0] || null, caption: post.look.caption || "" };
        handoff = { look, creator };
        const linked = services.find((service) => service.id === look.serviceId);
        if (linked) { linked.workspaceId = creator.workspaceId; linked.modes = creator.modes; }
      }
    }
  }
  return { plan: emptySavedPlan(), services, creator: null, look: null, handoff };
}

export function AppointmentPlanning() {
  const params = useSearchParams();
  const estimateView = params.get("view") === "estimate";
  const [sessionInfo, setSessionInfo] = useState(() => ({ session: readAppSession(), resolved: hasResolvedAppSession() }));
  const state = useSyncExternalStore(planClient.subscribe, planClient.getSnapshot, planClient.getServerSnapshot);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [estimateChecked, setEstimateChecked] = useState<string | null>(null);
  const [proposal, setProposal] = useState<PlanFields | null>(null);
  const [legacyIds, setLegacyIds] = useState<string[]>([]);
  const [validation, setValidation] = useState("");
  const applied = useRef("");
  const session = sessionInfo.session;
  const identity = identityFor(session);
  const draftScope = planDraftScope(session, sessionInfo.resolved);
  const context = sanitizePlanContext(estimateView ? {} : { targetType: params.get("targetType"), targetId: params.get("targetId"), serviceIds: params.get("serviceIds") ?? params.get("serviceId") });
  const resolved = resolvePlanContext(context, { professionals, salons, services: catalogue });
  const mode = resolved.mode;
  const contextKey = planContextKey({ mode, targetType: context.targetType, targetId: context.targetId });
  const lookParam = params.get("look");
  const workspaceParam = params.get("workspace");
  const originLookId = lookParam && isUuid(lookParam) ? lookParam : null;
  const originWorkspaceId = workspaceParam && isUuid(workspaceParam) ? workspaceParam : null;
  const linkKey = params.toString();
  const query = !estimateView && originLookId ? `?look=${originLookId}${originWorkspaceId ? `&workspace=${originWorkspaceId}` : ""}` : "";
  const clientReady = sessionInfo.resolved && state.identity === identity;

  useEffect(() => {
    listen();
    const sync = () => setSessionInfo({ session: readAppSession(), resolved: hasResolvedAppSession() });
    sync();
    window.addEventListener(APP_SESSION_EVENT, sync);
    return () => window.removeEventListener(APP_SESSION_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!sessionInfo.resolved || mode === "invalid") return;
    let cancelled = false;
    setLoadError(false); setProposal(null); setLegacyIds([]); setEstimateChecked(null); applied.current = "";
    planClient.identify(identity);
    if (identity) void planClient.load(query).then(() => { if (!cancelled && estimateView) setEstimateChecked(identity); });
    else if (!estimateView) {
      guestData(originLookId, originWorkspaceId).then((data) => { if (!cancelled) planClient.guest(data, query); }).catch(() => { if (!cancelled) setLoadError(true); });
    }
    return () => { cancelled = true; };
  }, [identity, sessionInfo.resolved, query, originLookId, originWorkspaceId, mode, attempt, estimateView]);

  useEffect(() => {
    if (estimateView || !clientReady || !state.data || state.loadedQuery !== query || mode === "invalid" || state.status === "loading") return;
    const signature = `${state.generation}|${identity}|${linkKey}`;
    if (applied.current === signature) return;
    applied.current = signature;
    const data = state.data;
    const current = state.draft;
    const empty = !current.serviceIds.length && !current.lookPostId && !current.preferredDate && !current.timeWindow && !current.serviceMode && !current.locationArea && !current.shortlistProviderWorkspaceIds.length;
    const allowed = new Set(data.services.filter((service) => mode !== "provider" || resolved.provider.serviceIds.includes(service.id)).map((service) => service.id));
    const incoming = data.handoff;
    if (incoming && incoming.look.postId !== current.lookPostId) {
      const sameCreator = !current.creatorWorkspaceId || current.creatorWorkspaceId === incoming.creator.workspaceId;
      const serviceIds = sameCreator ? [...new Set([...current.serviceIds, incoming.look.serviceId])] : [incoming.look.serviceId];
      const next: PlanFields = { ...current, lookPostId: incoming.look.postId, creatorWorkspaceId: incoming.creator.workspaceId, serviceIds };
      if (empty) planClient.edit(next); else setProposal({ ...next, serviceIds: [incoming.look.serviceId] });
    } else if (!originLookId && context.serviceIds.length) {
      const ids = context.serviceIds.filter((id) => allowed.has(id));
      if (ids.length) {
        const next = { ...current, serviceIds: [...new Set([...current.serviceIds, ...ids])] };
        if (empty) planClient.edit(next); else if (ids.some((id) => !current.serviceIds.includes(id))) setProposal({ ...next, serviceIds: ids });
      }
    } else if (!current.serviceIds.length && data.plan.revision === 0 && draftScope) {
      const stored = readPlanDraft(draftScope, contextKey)?.filter((id) => allowed.has(id)) ?? [];
      if (identity) setLegacyIds(stored);
      else if (stored.length) planClient.edit({ ...current, serviceIds: stored });
    }
  }, [clientReady, state.data, state.draft, state.generation, state.status, state.loadedQuery, query, identity, linkKey, mode, resolved.provider, context.serviceIds, draftScope, contextKey, originLookId, estimateView]);

  const edit = (patch: Partial<PlanFields>) => {
    setValidation("");
    const next = { ...planClient.getSnapshot().draft, ...patch };
    planClient.edit(next);
    if (!identity && draftScope) writePlanDraft(draftScope, contextKey, next.serviceIds);
  };
  const data = state.data;
  const draft = state.draft;
  const currentLook = data?.handoff?.look.postId === draft.lookPostId ? data.handoff.look : data?.look?.postId === draft.lookPostId ? data.look : null;
  const creator = data?.handoff?.creator.workspaceId === draft.creatorWorkspaceId ? data.handoff.creator : data?.creator?.workspaceId === draft.creatorWorkspaceId ? data.creator : null;
  const services = data?.services ?? [];
  const selectedServices = draft.serviceIds.map((id) => services.find((service) => service.id === id && (!draft.creatorWorkspaceId || !service.workspaceId || service.workspaceId === draft.creatorWorkspaceId)) ?? { id, name: "Unavailable service", workspaceId: null, price: null, category: "Unavailable", modes: [] });
  const eligibleServices = services.filter((service) => (!draft.creatorWorkspaceId || !service.workspaceId || service.workspaceId === draft.creatorWorkspaceId) && (mode !== "provider" || resolved.provider.serviceIds.includes(service.id)));
  const actualOwners = selectedServices.filter((service) => service.workspaceId);
  const modes = (creator?.modes ?? actualOwners[0]?.modes ?? []).filter((value) => actualOwners.every((service) => service.modes.includes(value)));
  const loading = !clientReady || !data || state.status === "loading";
  const missing = selectedServices.some((service) => service.name === "Unavailable service");
  const showSignIn = !session || session.role === "guest";
  const proposalReplacesServices = Boolean(draft.creatorWorkspaceId && proposal?.creatorWorkspaceId && draft.creatorWorkspaceId !== proposal.creatorWorkspaceId);
  const proposedIds = proposal ? proposalReplacesServices ? proposal.serviceIds : [...new Set([...draft.serviceIds, ...proposal.serviceIds])] : [];
  const exploreParams = new URLSearchParams();
  if (draft.serviceIds.length) exploreParams.set("serviceIds", draft.serviceIds.join(","));

  if (estimateView) return <AppShell currentNav="book"><PlanEstimate snapshot={clientReady && estimateChecked === identity ? state : null} resolved={sessionInfo.resolved} authenticated={Boolean(identity)}
    failure={state.status === "error" ? state.message : loadError ? "Your plan could not be loaded. Try again." : ""}
    retry={() => { if (clientReady) void (state.dirty ? planClient.save() : planClient.load(query)); else window.location.reload(); }} /></AppShell>;
  const canEstimate = Boolean(identity && clientReady && !state.dirty && !proposal && !loadError && (state.status === "ready" || state.status === "saved"));

  return <AppShell currentNav="book" allowedRoles={["guest", "client", "super_admin", "professional", "salon"]}>
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-6 pb-28">
      <header data-tour="planning-header" className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 sm:p-8">
        <Link href={`/discover${exploreParams.size ? `?${exploreParams}` : ""}`} className="inline-flex min-h-11 items-center text-sm underline">Back to Discover</Link>
        <h1 className="mt-4 font-display text-3xl font-semibold">Plan your beauty visit</h1>
        <p className="mt-2 text-sm">Choose a service and see an estimate.</p>
        {showSignIn ? <Link href="/auth/sign-in?returnTo=%2Fbook" className="mt-3 inline-block min-h-11 py-3 text-sm underline">Sign in to save across devices</Link> : !identity ? <p className="mt-3 text-sm">Use a client workspace to save a private plan.</p> : null}
      </header>
      {mode === "invalid" ? <section role="alert"><p>That provider selection could not be matched.</p><Link href="/book" className={secondary}>Open your plan</Link></section> : loadError || (!data && state.status === "error") ?
        <section role="alert"><p>{state.message || "Your plan could not be loaded. Try again."}</p><button type="button" className={secondary} onClick={() => setAttempt((value) => value + 1)}>Try again</button><button type="button" className={secondary} onClick={() => window.location.reload()}>Reload plan</button></section> : loading ?
        <div role="status" aria-label="Loading plan" className="min-h-80 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">Loading your plan...</div> : <>
          <div role="status" aria-live="polite" className="text-sm">{state.message}</div>
          {state.status === "error" ? <button type="button" className={secondary} onClick={() => void (state.dirty ? planClient.save() : planClient.load())}>Retry save</button> : null}
          {state.status === "conflict" ? <section role="alert" className="space-y-3 rounded-2xl border border-[var(--border-subtle)] p-4">
            <p>A newer version was saved in another tab or device. Your edits have not been discarded.</p>
            <p className="text-sm">Saved revision: {state.remote?.revision}. Choose which version to keep.</p>
            <div className="flex flex-wrap gap-3"><button type="button" className={secondary} onClick={() => void planClient.resolveConflict(false)}>Load saved version</button><button type="button" className={secondary} onClick={() => void planClient.resolveConflict(true)}>Keep my edits and save</button></div>
          </section> : null}
          {proposal ? <section className="space-y-3 rounded-2xl border border-[var(--border-subtle)] p-4">
            <p>This link has new choices. Your existing plan is unchanged.</p>
            <p className="text-sm">{proposal.creatorWorkspaceId !== draft.creatorWorkspaceId && draft.creatorWorkspaceId ? "Using this creator replaces your service choices. Date, time and area stay as you chose them." : "Add these choices while keeping your current preferences."}</p>
            {proposedIds.length > 10 ? <p role="alert" className="text-sm">Remove a service before adding these choices.</p> : null}
            <div className="flex flex-wrap gap-3"><button type="button" className={secondary} disabled={proposedIds.length > 10} onClick={() => {
              const current = planClient.getSnapshot().draft;
              const replace = current.creatorWorkspaceId && proposal.creatorWorkspaceId && proposal.creatorWorkspaceId !== current.creatorWorkspaceId;
              const nextIds = replace ? proposal.serviceIds : [...new Set([...current.serviceIds, ...proposal.serviceIds])];
              if (nextIds.length > 10) { setValidation("Choose up to ten services."); return; }
              edit({ lookPostId: proposal.lookPostId, creatorWorkspaceId: proposal.creatorWorkspaceId, serviceIds: nextIds }); setProposal(null);
            }}>Use choices from this link</button><button type="button" className={secondary} onClick={() => setProposal(null)}>Keep current plan</button></div>
          </section> : null}
          {legacyIds.length && state.revision === 0 && !state.dirty ? <section className="space-y-3 rounded-2xl border border-[var(--border-subtle)] p-4"><p>A service draft from this client workspace is available in this tab.</p><button type="button" className={secondary} onClick={() => { edit({ ...emptyPlanFields(), serviceIds: legacyIds }); setLegacyIds([]); }}>Import my tab draft</button></section> : null}
          {originLookId && !data?.handoff && draft.lookPostId !== originLookId ? <p role="alert">The look from this link is unavailable. Your existing choices are unchanged.</p> : null}
          {draft.lookPostId ? <section className="flex min-w-0 gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
            {currentLook?.thumbnailUrl ? <Image unoptimized width={96} height={120} src={currentLook.thumbnailUrl} alt="Your selected look" className="h-24 w-20 shrink-0 rounded-xl object-cover" /> : null}
            <div className="min-w-0"><p className="text-sm font-semibold">Planning from a look</p><p className="mt-1 break-words text-sm">{creator?.displayName ?? "This creator is unavailable."}</p>
              {currentLook ? <Link href={`/looks/${currentLook.postId}`} className="mt-2 inline-block min-h-11 py-3 text-sm underline">Back to the look</Link> : <p className="mt-2 text-sm">This look is no longer available. Your other choices are still here.</p>}
              {creator ? <Link href={`/creators/${creator.workspaceId}`} className="ml-3 inline-block min-h-11 py-3 text-sm underline">View creator</Link> : null}
            </div>
          </section> : null}
          <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 sm:p-6">
            <h2 className="font-display text-2xl font-semibold">Choose a service</h2>
            <p className="text-sm">Choose up to ten. Catalogue interests do not confirm a provider or price.</p>
            {missing ? <p role="alert" className="text-sm">A selected service is inactive or removed. Your other choices are unchanged. Remove it to revise your selection.</p> : null}
            {!draft.serviceIds.length ? <p className="text-sm">Your plan is empty. Choose a service to get started.</p> : <ul className="space-y-2">{selectedServices.map((service) => <li key={service.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] p-3"><span className="min-w-0 break-words text-sm">{service.name}</span><button type="button" aria-label={`Remove ${service.name}`} className={secondary} onClick={() => edit({ serviceIds: draft.serviceIds.filter((id) => id !== service.id) })}>Remove</button></li>)}</ul>}
            <div role="group" aria-label="Services" className="grid gap-3 sm:grid-cols-2">{eligibleServices.map((service) => <button key={service.id} type="button" aria-pressed={draft.serviceIds.includes(service.id)} disabled={!draft.serviceIds.includes(service.id) && draft.serviceIds.length >= 10}
              className={cn("min-h-11 min-w-0 rounded-2xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50", draft.serviceIds.includes(service.id) ? "border-[var(--world-accent-strong)] bg-[var(--world-accent-soft)]" : "border-[var(--border-subtle)]")}
              onClick={() => edit({ serviceIds: draft.serviceIds.includes(service.id) ? draft.serviceIds.filter((id) => id !== service.id) : [...draft.serviceIds, service.id] })}>
              <span className="block break-words font-semibold">{service.name}</span><span className="mt-1 block text-sm">{service.price !== null ? `From ${formatListedPrice(listedPriceInCents(service.price))}` : "Service interest. Price not provided."}</span>
            </button>)}</div>
          </section>
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 sm:p-6">
            <h2 className="font-display text-2xl font-semibold">Your preferences</h2>
            <p className="mt-2 text-sm">These are preferences, not available or reserved appointment slots.</p>
            <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0"><label htmlFor="plan-date" className="text-sm font-semibold">Preferred date</label><input id="plan-date" type="date" value={draft.preferredDate ?? ""} className={inputStyle} onChange={(event) => edit({ preferredDate: event.target.value || null })} /></div>
              <div className="min-w-0"><label htmlFor="plan-window" className="text-sm font-semibold">Preferred time window</label><select id="plan-window" value={draft.timeWindow ?? ""} className={inputStyle} onChange={(event) => edit({ timeWindow: (event.target.value || null) as PlanFields["timeWindow"] })}><option value="">No preference</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></div>
              <div className="min-w-0"><label htmlFor="plan-mode" className="text-sm font-semibold">Service mode</label><select id="plan-mode" value={modes.includes(draft.serviceMode ?? "") ? draft.serviceMode! : ""} className={inputStyle} onChange={(event) => edit({ serviceMode: (event.target.value || null) as PlanFields["serviceMode"] })}><option value="">No confirmed preference</option>{modes.includes("salon") ? <option value="salon">Salon</option> : null}{modes.includes("mobile") ? <option value="mobile">Mobile</option> : null}</select></div>
              <div className="min-w-0"><label htmlFor="plan-area" className="text-sm font-semibold">General location area</label><input id="plan-area" type="text" maxLength={120} autoComplete="off" placeholder="For example, Kilimani" value={draft.locationArea} className={inputStyle} onChange={(event) => { const value = event.target.value; if (/[<>\x00-\x1f\x7f]/.test(value)) { setValidation("Use a general area without special markup."); return; } edit({ locationArea: value }); }} /></div>
            </div>
            {!modes.length ? <p className="mt-3 text-sm">Service modes have not been confirmed for this selection.</p> : null}
            {draft.serviceMode && !modes.includes(draft.serviceMode) ? <p role="alert" className="mt-3 text-sm">Your previous service mode is no longer confirmed. Choose a supported mode or clear this preference.</p> : null}
            {draft.serviceMode && !modes.includes(draft.serviceMode) ? <button type="button" className={secondary} onClick={() => edit({ serviceMode: null })}>Clear service mode</button> : null}
            {validation ? <p role="alert" className="mt-3 text-sm">{validation}</p> : null}
          </section>
          <div className="flex flex-wrap items-center gap-3"><Link href="/book?view=estimate" aria-disabled={!canEstimate} aria-describedby={!canEstimate ? "estimate-readiness" : undefined} onClick={(event) => { if (!canEstimate) event.preventDefault(); }} className={cn("inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--action-primary-bg)] px-6 py-3 font-semibold text-[var(--action-primary-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]", !canEstimate && "opacity-50")}>See my estimate</Link><Link href="/book" className={secondary} onClick={() => { edit(emptyPlanFields()); setProposal(null); setLegacyIds([]); }}>Clear plan</Link></div>
          {!canEstimate ? <p id="estimate-readiness" role="status" className="text-sm">{!identity ? "Sign in with a client workspace to see your estimate." : proposal ? "Choose whether to use the incoming choices before continuing." : "Finish saving your plan before continuing to the estimate."}</p> : null}
          <p className="text-sm">Prices and availability are confirmed by the professional.</p>
          <p className="text-xs">Preview only. Prices are estimates. Booking is not available yet.</p>
        </>}
    </div>
  </AppShell>;
}
