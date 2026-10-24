"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Bookmark } from "lucide-react";
import { APP_SESSION_EVENT, readAppSession } from "@/lib/client-session";
import { createPrivateSaves } from "@/lib/private-saves";
import { summarizeServiceRows, toInspireItem, type FeedPostRow, type InspireLookItem } from "@/lib/social-feed";

export const privateSaves = createPrivateSaves((...args) => fetch(...args));
let listening = false;
function syncIdentity() {
  const session = readAppSession() as (ReturnType<typeof readAppSession> & { workspaceId?: string });
  privateSaves.identify(session?.role === "client" && session.workspaceId ? JSON.stringify([session.id, session.workspaceId]) : null);
}
function subscribe(listener: () => void) {
  const unsubscribe = privateSaves.subscribe(listener);
  if (!listening) {
    listening = true;
    window.addEventListener(APP_SESSION_EVENT, syncIdentity);
    syncIdentity();
  }
  return unsubscribe;
}
export function usePrivateSaves() {
  return useSyncExternalStore(subscribe, privateSaves.getSnapshot, privateSaves.getServerSnapshot);
}

export function SavesFeedback({ postId, exceptPostIds = [] }: { postId?: string; exceptPostIds?: string[] } = {}) {
  const state = usePrivateSaves();
  if (!state.message || (postId && state.target !== postId) || (!postId && exceptPostIds.includes(state.target || ""))) return null;
  return <div className="my-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)]">
    <span role="status" aria-live="polite">{state.message}</span>
    {state.undo ? <button type="button" disabled={state.pending} onClick={() => void privateSaves.undo()}
      className="ml-3 min-h-11 px-3 font-semibold underline focus-visible:outline focus-visible:outline-2">Undo</button> : null}
  </div>;
}

export function PrivateSaveButton({ postId }: { postId: string }) {
  const state = usePrivateSaves();
  const saved = state.ids.includes(postId);
  const style = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-60";
  if (!state.identity) return <Link href="/auth/sign-in" className={style}>Sign in to save</Link>;
  if (state.status === "error") return <div><button type="button" className={style} onClick={() => void privateSaves.refresh()}>Retry saves</button><SavesFeedback postId={postId} /></div>;
  return <div data-save-target={postId} className="block"><button type="button" aria-label={saved ? "Unsave look" : "Save look"} aria-pressed={saved}
    aria-busy={state.pending && state.target === postId}
    disabled={state.pending || state.status !== "ready"} className={style}
    onClick={() => void privateSaves.change(postId, !saved)}>
    <Bookmark aria-hidden="true" className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
    {state.status === "loading" ? "Loading saves..." : state.pending && state.target === postId ? (saved ? "Saving..." : "Removing...") : saved ? "Saved" : "Save"}
  </button><SavesFeedback postId={postId} /></div>;
}

export function PrivateSavedCollection({ renderLook }: { renderLook: (item: InspireLookItem) => React.ReactNode }) {
  const state = usePrivateSaves();
  const [result, setResult] = useState<{ key: string; items: InspireLookItem[]; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([state.generation, state.identity, state.ids]);
  useEffect(() => {
    let cancelled = false;
    if (!state.identity || state.status !== "ready" || !state.ids.length) return;
    const ids = state.ids;
    async function load() {
      try {
        const [postsResponse, servicesResponse] = await Promise.all([
          fetch(`/api/social/posts?ids=${ids.join(",")}`, { cache: "no-store" }), fetch("/api/services"),
        ]);
        if (!postsResponse.ok || !servicesResponse.ok) throw new Error();
        const [posts, services] = await Promise.all([postsResponse.json(), servicesResponse.json()]);
        if (!posts.ok || !Array.isArray(posts.posts)) throw new Error();
        const summaries = summarizeServiceRows(services.services);
        const items = (posts.posts as FeedPostRow[]).filter((post) => ids.includes(post.id))
          .map((post) => toInspireItem(post, summaries)).filter((item): item is InspireLookItem => item !== null);
        if (!cancelled) setResult({ key, items, error: false });
      } catch {
        if (!cancelled) setResult({ key, items: [], error: true });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [key, attempt, state.identity, state.status, state.ids]);

  if (!state.identity) return <p>Use a client workspace to see your private saves.</p>;
  if (state.status === "error") return <div role="alert">{state.message} <button type="button" onClick={() => void privateSaves.refresh()} className="min-h-11 underline">Try again</button></div>;
  if (state.status !== "ready") return <p role="status">Loading saved looks...</p>;
  if (!state.ids.length) return <div><SavesFeedback /><p>No saved looks yet. Save a look from Inspire to find it here.</p><Link href="/discover?tab=looks" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-[var(--action-primary-bg)] px-5 font-semibold text-[var(--action-primary-text)]">Browse looks</Link></div>;
  if (result?.key !== key) return <div><SavesFeedback /><p role="status">Loading saved looks...</p></div>;
  if (result.error) return <div><SavesFeedback /><div role="alert">Saved looks could not be loaded. <button type="button" onClick={() => setAttempt((value) => value + 1)} className="min-h-11 underline">Try again</button></div></div>;
  return <div>
    {!result.items.some((item) => item.id === state.target) ? <SavesFeedback /> : null}
    {result.items.length < state.ids.length ? <p className="mb-3 text-sm">Some saved looks are no longer available.</p> : null}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{result.items.map(renderLook)}</div>
  </div>;
}
