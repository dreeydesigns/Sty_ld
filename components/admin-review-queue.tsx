"use client";

// Server-backed review queue. Every row and every decision comes from
// /api/admin/moderation, which is gated on a real administrator session with MFA.
import { useCallback, useEffect, useRef, useState } from "react";
import { postTypeLabel } from "@/lib/social-feed";

type QueuePost = {
  id: string;
  caption: string;
  author_name: string;
  author_role: string;
  post_type: string;
  created_at: string;
  serviceCheck: "eligible" | "ineligible" | null;
};

const SERVICE_STATE: Record<string, string> = {
  eligible: "Service reference is eligible",
  ineligible: "Service reference is not eligible",
};

export function AdminReviewQueue() {
  const [posts, setPosts] = useState<QueuePost[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/moderation", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!mounted.current) return;
      if (!response.ok) {
        setPosts(null);
        setError(body?.error || body?.message || "The review queue could not be loaded.");
        return;
      }
      setPosts(Array.isArray(body?.posts) ? body.posts : []);
    } catch {
      if (mounted.current) {
        setPosts(null);
        setError("The review queue could not be loaded. Check your connection and try again.");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(postId: string, decision: "approve" | "reject") {
    setBusyId(postId);
    setStatus("");
    setError("");
    try {
      const response = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postId,
          decision,
          ...(decision === "reject" ? { reason: reasons[postId] ?? "" } : {}),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!mounted.current) return;
      if (!response.ok) {
        setStatus(body?.error || body?.message || "That decision was not recorded.");
        return;
      }
      setStatus(
        body.resultingStatus === "published"
          ? "Published. The decision and your name are recorded in the audit trail."
          : "Rejected. The decision and your name are recorded in the audit trail.",
      );
      await load();
    } catch {
      if (mounted.current) setStatus("The decision was not recorded. Try again.");
    } finally {
      if (mounted.current) setBusyId("");
    }
  }

  return (
    <section
      aria-labelledby="review-queue-heading"
      className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[0_12px_28px_rgba(13,27,42,0.06)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="review-queue-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
          Community review queue
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
        >
          Refresh
        </button>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        These are real posts awaiting review on this environment. Approving or rejecting changes the
        published state in the database and writes an audit record against your account.
      </p>

      <p aria-live="polite" className="mt-3 min-h-6 text-sm font-semibold text-[var(--text-primary)]">
        {status}
      </p>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-primary)]">
          {error}
        </p>
      ) : posts === null ? (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading the review queue.</p>
      ) : posts.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Nothing is awaiting review on this environment.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {posts.map(post => (
            <li
              key={post.id}
              className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4"
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {post.caption || "Untitled Look"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {post.author_name} · {post.author_role} · {postTypeLabel(post.post_type)} ·{" "}
                {new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(
                  new Date(post.created_at),
                )}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {post.serviceCheck ? SERVICE_STATE[post.serviceCheck] : "No service reference attached"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busyId === post.id || post.serviceCheck === "ineligible"}
                  onClick={() => void decide(post.id, "approve")}
                  className="rounded-xl bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busyId === post.id ? "Working" : "Approve"}
                </button>
                <label className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span>Reason for rejecting</span>
                  <input
                    value={reasons[post.id] ?? ""}
                    onChange={event => setReasons(current => ({ ...current, [post.id]: event.target.value }))}
                    className="w-44 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm text-[var(--text-primary)]"
                    maxLength={280}
                  />
                </label>
                <button
                  type="button"
                  disabled={busyId === post.id || (reasons[post.id] ?? "").trim().length < 5}
                  onClick={() => void decide(post.id, "reject")}
                  className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
