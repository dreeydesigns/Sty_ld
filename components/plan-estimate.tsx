"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import type { PlanSnapshot } from "@/lib/plan-client";
import type { PlanService } from "@/lib/plan-v2";
import { summarizePlanSelection, formatListedPrice } from "@/lib/plan-offer.cjs";

type Line = PlanService & { cents: number | null; durationMinutes: number | null; problem: string | null };
const card = "rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 sm:p-7";
const secondary = "inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]";

export function PlanEstimate({ snapshot, resolved, authenticated, failure, retry }: {
  snapshot: PlanSnapshot | null; resolved: boolean; authenticated: boolean; failure: string; retry: () => void;
}) {
  useEffect(() => { document.getElementById("estimate-heading")?.focus(); }, []);
  const blocked = !resolved || (authenticated && !failure && (!snapshot?.data || snapshot.status === "loading" || snapshot.status === "saving"));
  let estimate: { lines: Line[]; knownSubtotalCents: number | null; complete: boolean; multipleProviders: boolean } | null = null;
  let calculationError = false;
  const plan = snapshot?.draft, data = snapshot?.data;
  const creator = plan && data?.creator && data.creator.workspaceId === plan.creatorWorkspaceId ? data.creator : null;
  const look = plan && data?.look && data.look.postId === plan.lookPostId && data.look.creatorWorkspaceId === plan.creatorWorkspaceId ? data.look : null;
  if (authenticated && plan && data && !blocked && !failure && snapshot?.status !== "conflict" && !snapshot?.dirty) {
    try {
      estimate = summarizePlanSelection(plan.serviceIds.map((id) => data.services.find((service) => service.id === id) ?? {
        id, name: "Unavailable service", workspaceId: null, price: null, modes: [], unavailable: true,
      }), { kind: "listed", creatorWorkspaceId: plan.creatorWorkspaceId, creatorUnavailable: Boolean(plan.creatorWorkspaceId && !creator) });
    } catch { calculationError = true; }
  }
  return <div className="mx-auto w-full min-w-0 max-w-4xl space-y-6 pb-28">
    <nav aria-label="Beauty journey" className="text-xs sm:text-sm"><ol className="flex flex-wrap gap-x-4 gap-y-2">
      {["Inspire", "Plan", "Estimate", "Compare", "Request"].map((stage, index) => <li key={stage} aria-current={stage === "Estimate" ? "step" : undefined} className={stage === "Estimate" ? "font-semibold" : "text-[var(--text-secondary)]"}>{stage}{index > 2 ? " (Upcoming)" : ""}</li>)}
    </ol></nav>
    <header className={card}><h1 id="estimate-heading" tabIndex={-1} className="font-display text-3xl font-semibold">Your estimate</h1><p className="mt-2 text-sm">Listed prices for your current plan. No appointment is reserved.</p></header>
    <Link href="/book" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--action-primary-bg)] px-6 py-3 font-semibold text-[var(--action-primary-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">Edit my plan</Link>
    {blocked ? <div role="status" aria-label="Loading estimate" aria-busy="true" className={`${card} min-h-[32rem] space-y-6`}>
      <p>Loading your plan and listed prices...</p><div className="h-24 rounded-xl bg-[var(--surface-elevated)]" /><div className="h-40 rounded-xl bg-[var(--surface-elevated)]" /><div className="h-24 rounded-xl bg-[var(--surface-elevated)]" />
    </div> : !authenticated ? <section role="alert" className={card}><p>Use a signed-in client workspace to see its private estimate.</p><Link href="/auth/sign-in?returnTo=%2Fbook%3Fview%3Destimate" className={`${secondary} mt-4`}>Sign in to continue</Link></section> : failure || snapshot?.status === "error" ?
      <section role="alert" className={card}><p>{failure || snapshot?.message || "Your plan could not be loaded."}</p><p className="mt-2 text-sm">Your estimate is unavailable until the plan can be checked.</p><button type="button" className={`${secondary} mt-4`} onClick={retry}>Retry estimate</button></section> : snapshot?.status === "conflict" || snapshot?.dirty ?
        <section role="alert" className={card}><p>{snapshot.status === "conflict" ? "A newer plan was saved elsewhere. Your edits are still here." : "Your latest changes have not been saved yet."}</p><p className="mt-2 text-sm">Edit your plan to resolve the save before viewing its estimate.</p></section> : calculationError ?
          <section role="alert" className={card}><p>The listed prices could not be calculated safely.</p><button type="button" className={`${secondary} mt-4`} onClick={retry}>Retry estimate</button></section> : estimate && plan ? <>
            {plan.lookPostId || plan.creatorWorkspaceId ? <section className={`${card} flex min-w-0 gap-4`}>
              {look?.thumbnailUrl ? <Image unoptimized src={look.thumbnailUrl} alt="Your selected look" width={80} height={96} className="h-24 w-20 shrink-0 rounded-xl object-cover" /> : null}
              <div className="min-w-0"><h2 className="font-semibold">Your inspiration</h2><p className="mt-2 break-words text-sm">{creator?.displayName ?? "This creator is no longer available."}</p>
                {plan.lookPostId && !look ? <p className="mt-2 text-sm">This look is no longer available. Your other preferences are still here.</p> : null}
              </div>
            </section> : null}
            <section className={card}><h2 className="font-display text-2xl font-semibold">Selected services</h2>
              {!estimate.lines.length ? <p className="mt-3">No services selected. Edit your plan to choose a service.</p> : <ul className="mt-4 divide-y divide-[var(--border-subtle)]">{estimate.lines.map((line) => <li key={line.id} className="space-y-2 py-4 first:pt-0">
                <h3 className="break-words font-semibold">{line.name}</h3><p className="break-words text-sm">{line.providerName || (creator && line.workspaceId === creator.workspaceId ? creator.displayName : "Provider details not provided")}</p>
                <dl className="grid grid-cols-2 gap-2 text-sm"><dt>Listed price</dt><dd className="text-right font-semibold">{formatListedPrice(line.cents)}</dd><dt>Duration</dt><dd className="text-right">{line.durationMinutes !== null ? `${line.durationMinutes} minutes` : "Not provided"}</dd></dl>
                {line.problem ? <p role="alert" className="text-sm">{line.problem} Edit your plan to review this choice.</p> : null}
              </li>)}</ul>}
            </section>
            <section className={card}><h2 className="font-display text-2xl font-semibold">Your preferences</h2><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt>Preferred date</dt><dd className="break-words">{plan.preferredDate ?? "Not provided"}</dd><dt>Time window</dt><dd className="capitalize">{plan.timeWindow ?? "No preference"}</dd>
              <dt>Service preference</dt><dd className="capitalize">{plan.serviceMode ?? "No preference"}</dd><dt>General location area</dt><dd className="break-words">{plan.locationArea || "Not provided"}</dd>
            </dl><p className="mt-4 text-xs">Preferences do not confirm availability or a service area.</p></section>
            <section className={card}><h2 className="font-display text-2xl font-semibold">Price breakdown</h2>
              {estimate.multipleProviders ? <p className="mt-3 text-sm">These services belong to different professionals. Their listed prices are not one provider quotation.</p> : null}
              <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>{estimate.multipleProviders ? "Combined listed service prices" : "Listed service subtotal"}</dt><dd className="shrink-0 font-semibold">{estimate.complete ? formatListedPrice(estimate.knownSubtotalCents) : "Not provided"}</dd></div>
                <div className="flex justify-between gap-4"><dt>Add-ons</dt><dd>Unconfirmed</dd></div><div className="flex justify-between gap-4"><dt>Mobile travel fees</dt><dd>Unconfirmed</dd></div>
                <div className="flex justify-between gap-4"><dt>Taxes and other applicable charges</dt><dd>Unconfirmed</dd></div><div className="flex justify-between gap-4 border-t border-[var(--border-subtle)] pt-3"><dt>Final payable total</dt><dd className="shrink-0 font-semibold">Not provided</dd></div>
              </dl>
              {!estimate.complete && estimate.lines.length ? <p className="mt-4 text-sm">One or more service prices are missing or unavailable. A complete listed subtotal cannot be shown.</p> : null}
              <p className="mt-4 text-sm">Prices and availability are confirmed by the professional.</p><p className="mt-2 text-xs">Any applicable extras need confirmation. This preview creates no booking or payment commitment.</p>
            </section>
          </> : null}
  </div>;
}
