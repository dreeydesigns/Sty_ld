"use client";

import Link from "next/link";
import Image from "next/image";
import { useLookReturn } from "@/lib/look-navigation";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { SavesFeedback } from "@/components/private-saves";
import { ShortlistButton } from "@/components/shortlist";
import { InspireLookCard } from "@/components/marketplace-ui";
import { loadInspireFeed, type InspireLookItem } from "@/lib/social-feed";

type Creator = {
  workspaceId: string;
  role: string;
  displayName: string | null;
  username: string | null;
  specialty: string | null;
  location: string | null;
  serviceMode: string | null;
  bio: string | null;
  photoUrl: string | null;
};

type PageStatus = "loading" | "ready" | "notfound" | "error";

export default function CreatorProfilePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const back = useLookReturn(`/creators/${workspaceId}`);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [creator, setCreator] = useState<Creator | null>(null);
  const [looks, setLooks] = useState<InspireLookItem[]>([]);
  const [looksLoading, setLooksLoading] = useState(true);
  const [looksFailed, setLooksFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setLooksFailed(false);
      setLooksLoading(true);
      setLooks([]);
      try {
        const creatorResponse = await fetch(`/api/creators/${workspaceId}`);
        if (cancelled) return;
        if (creatorResponse.status === 404) {
          setStatus("notfound");
          return;
        }
        if (!creatorResponse.ok) throw new Error("The creator could not be loaded.");
        const creatorPayload = (await creatorResponse.json().catch(() => null)) as
          | { ok?: boolean; creator?: Creator }
          | null;
        if (!creatorPayload || creatorPayload.ok !== true || !creatorPayload.creator) {
          setStatus("notfound");
          return;
        }

        setCreator(creatorPayload.creator);
        setStatus("ready");

        try {
          const items = await loadInspireFeed({ authorWorkspaceId: workspaceId });
          if (cancelled) return;
          setLooks(items);
          setLooksLoading(false);
        } catch {
          if (cancelled) return;
          setLooksFailed(true);
          setLooksLoading(false);
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, attempt]);

  const roleText = creator && creator.role === "salon" ? "Salon" : "Professional";
  const heading = creator && creator.displayName ? creator.displayName : roleText;
  const metaLine = creator
    ? [creator.specialty, creator.location, creator.serviceMode].filter(Boolean).join(" \u00B7 ")
    : "";
  const initial = heading.trim().charAt(0).toUpperCase() || "S";

  if (status === "loading") {
    return (
      <AppShell currentNav="discover">
        <div role="status" aria-label="Loading creator" className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--bg-surface-raised)]" />
          <div className="mt-5 h-20 w-20 animate-pulse rounded-full bg-[var(--bg-surface-raised)]" />
          <div className="mt-4 h-6 w-48 animate-pulse rounded bg-[var(--bg-surface-raised)]" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-[var(--bg-surface-raised)]" />
        </div>
      </AppShell>
    );
  }

  if (status !== "ready" || !creator) {
    const isError = status === "error";
    return (
      <AppShell currentNav="discover">
        <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
          <Link
            href={back.href}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] underline decoration-[var(--color-clay)] underline-offset-4"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {back.label}
          </Link>
          <div className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {isError ? "This creator could not be loaded" : "Creator not found"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              {isError
                ? "Check your connection, then try again."
                : "This profile may be unavailable or the link may be wrong."}
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
                href={back.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-card)] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] hover:border-[var(--color-clay)]"
              >
                {back.label}
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentNav="discover" showFooter>
      <SavesFeedback exceptPostIds={looks.map((look) => look.id)} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <Link
          href={back.href}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] underline decoration-[var(--color-clay)] underline-offset-4"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {back.label}
        </Link>

        <header className="mt-4 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-start gap-4">
            {creator.photoUrl ? (
              <Image unoptimized width={64} height={64}
                src={creator.photoUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full object-cover border border-[var(--border-subtle)]"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-clay)] text-xl font-bold text-[var(--color-ink)]"
              >
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[clamp(1.35rem,4vw,1.75rem)] font-semibold leading-tight text-[var(--text-primary)]">
                  {heading}
                </h1>
                <span className="rounded-full bg-[var(--bg-surface-raised)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {roleText}
                </span>
              </div>
              {creator.username ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">@{creator.username}</p>
              ) : null}
              {metaLine ? <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{metaLine}</p> : null}
              {creator.bio ? (
                <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-6 text-[var(--text-secondary)]">
                  {creator.bio}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-4"><ShortlistButton workspaceId={workspaceId} name={heading} /></div>
        </header>

        <section className="mt-6">
          <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">Looks</h2>
          {looksLoading ? <p role="status" className="mt-4">Loading published looks...</p> : looksFailed ? (
            <div className="mt-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Looks are unavailable right now</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Check your connection, then try again.</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-card)] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] hover:border-[var(--color-clay)]"
              >
                Try again
              </button>
            </div>
          ) : looks.length === 0 ? (
            <div className="mt-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">No published looks yet</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                This creator has no published looks right now.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {looks.map((item) => (
                <InspireLookCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
