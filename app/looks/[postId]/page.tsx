"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Share2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  postTypeLabel,
  summarizeServiceRows,
  toInspireItem,
  type FeedPostRow,
  type InspireLookItem,
} from "@/lib/social-feed";
import { cn, formatKES } from "@/lib/utils";

type CreatorProfile = {
  displayName?: string | null;
  role?: string | null;
  location?: string | null;
  serviceMode?: string | null;
};

type ViewStatus = "loading" | "ready" | "unavailable" | "error";

export default function LookDetailPage() {
  const params = useParams<{ postId: string }>();
  const postId = params.postId;
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ViewStatus>("loading");
  const [item, setItem] = useState<InspireLookItem | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const postResponse = await fetch(`/api/social/posts/${postId}`);
        if (cancelled) return;
        if (postResponse.status === 404) {
          setStatus("unavailable");
          return;
        }
        if (!postResponse.ok) throw new Error("The look could not be loaded.");
        const payload = (await postResponse.json().catch(() => null)) as
          | { ok?: boolean; post?: FeedPostRow }
          | null;
        if (!payload || payload.ok !== true || !payload.post || !payload.post.look) {
          setStatus("unavailable");
          return;
        }

        const [servicesResponse, creatorResponse] = await Promise.all([
          fetch("/api/services").catch(() => null),
          fetch(`/api/creators/${payload.post.author_workspace_id}`).catch(() => null),
        ]);
        if (cancelled) return;

        const servicesPayload =
          servicesResponse && servicesResponse.ok
            ? await servicesResponse.json().catch(() => null)
            : null;
        const services = summarizeServiceRows(servicesPayload ? servicesPayload.services : null);
        const built = toInspireItem(payload.post, services);
        if (!built) {
          setStatus("unavailable");
          return;
        }

        let creatorProfile: CreatorProfile | null = null;
        if (creatorResponse && creatorResponse.ok) {
          const creatorPayload = (await creatorResponse.json().catch(() => null)) as
            | { ok?: boolean; creator?: CreatorProfile }
            | null;
          if (creatorPayload && creatorPayload.ok === true && creatorPayload.creator) {
            creatorProfile = creatorPayload.creator;
          }
        }

        setItem(built);
        setCreator(creatorProfile);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId, attempt]);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: item ? item.title : "STYLD look", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2000);
    } catch {
      // Sharing was dismissed or the clipboard is unavailable.
    }
  }

  if (status === "loading") {
    return (
      <AppShell currentNav="discover">
        <div role="status" aria-label="Loading look" className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 sm:px-6">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--bg-surface-raised)]" />
          <div className="mt-4 aspect-[4/5] w-full animate-pulse rounded-[28px] bg-[var(--bg-surface-raised)]" />
          <div className="mt-5 h-6 w-3/4 animate-pulse rounded bg-[var(--bg-surface-raised)]" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--bg-surface-raised)]" />
        </div>
      </AppShell>
    );
  }

  if (status === "unavailable" || status === "error" || !item) {
    const isError = status === "error";
    return (
      <AppShell currentNav="discover">
        <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 sm:px-6">
          <Link
            href="/discover?tab=looks"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] underline decoration-[var(--color-clay)] underline-offset-4"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to looks
          </Link>
          <div className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {isError ? "This look could not be loaded" : "This look is unavailable"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              {isError
                ? "Check your connection, then try again."
                : "It may have been unpublished or removed, or the link may be wrong."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {isError ? (
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--action-primary-bg)] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[var(--action-primary-text)]"
                >
                  Try again
                </button>
              ) : null}
              <Link
                href="/discover?tab=looks"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-card)] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] hover:border-[var(--color-clay)]"
              >
                Back to looks
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const eyebrow = item.service && item.service.category ? item.service.category : postTypeLabel(item.postType);
  const roleText = item.authorRole === "salon" ? "Salon" : "Professional";
  const metaLine = [roleText, creator && creator.location ? creator.location : null, creator && creator.serviceMode ? creator.serviceMode : null]
    .filter(Boolean)
    .join(" \u00B7 ");
  const planHref = item.service
    ? `/book?serviceIds=${encodeURIComponent(item.service.id)}&look=${encodeURIComponent(item.id)}&workspace=${encodeURIComponent(item.authorWorkspaceId)}`
    : null;

  return (
    <AppShell currentNav="discover">
      <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 sm:px-6">
        <Link
          href="/discover?tab=looks"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] underline decoration-[var(--color-clay)] underline-offset-4"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to looks
        </Link>

        <article className="mt-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]">
            {item.mediaUrls[0] ? (
              <img
                src={item.mediaUrls[0]}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(160deg,var(--world-accent-soft,rgba(196,164,149,0.18)),var(--bg-surface-raised))]">
                <span className="px-8 text-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  {postTypeLabel(item.postType)}
                </span>
              </div>
            )}
            {item.demoFixture ? (
              <span className="absolute left-4 top-4 rounded-full bg-[var(--color-clay)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink)] shadow-sm">
                Demo
              </span>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--bg-surface-raised)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-clay-text)] border border-[var(--border-subtle)]">
              {eyebrow}
            </span>
          </div>

          <h1 className="mt-3 font-display text-[clamp(1.6rem,5vw,2.1rem)] font-semibold leading-tight text-[var(--text-primary)]">
            {item.title}
          </h1>
          {item.caption && item.service ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--text-secondary)]">{item.caption}</p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.authorName}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{metaLine}</p>
            </div>
            <Link
              href={`/creators/${item.authorWorkspaceId}`}
              className="shrink-0 text-xs font-semibold text-[var(--text-primary)] underline decoration-[var(--color-clay)] underline-offset-4"
            >
              View creator
            </Link>
          </div>

          {item.service ? (
            <section className="mt-4 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-clay-text)]">Linked service</p>
              <h2 className="mt-1.5 font-display text-lg font-semibold text-[var(--text-primary)]">{item.service.name}</h2>
              {item.service.description ? (
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{item.service.description}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">From {formatKES(item.service.price)}</span>
                {item.service.durationMinutes ? <span>{item.service.durationMinutes} min</span> : null}
                {item.service.category ? <span>{item.service.category}</span> : null}
              </div>
            </section>
          ) : (
            <p className="mt-4 rounded-[22px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
              The service for this look is unavailable right now.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {planHref ? (
              <Link
                href={planHref}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--action-primary-bg)] px-6 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                )}
              >
                Plan this look
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-clay)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              {shareState === "copied" ? (
                <>
                  <Check aria-hidden="true" className="h-4 w-4" />
                  Link copied
                </>
              ) : (
                <>
                  <Share2 aria-hidden="true" className="h-4 w-4" />
                  Share
                </>
              )}
            </button>
          </div>

          <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
            Estimates only. Booking is not available yet.
          </p>
        </article>
      </div>
    </AppShell>
  );
}
