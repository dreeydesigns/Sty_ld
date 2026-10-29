"use client";

/**
 * JOURNEY-05 surfaces.
 *
 * RequestDiscussionButton lets a signed-in client ask one provider to discuss a Look, a service
 * or a saved plan. DiscussionRequestsPanel shows what the caller sent and, for a professional or
 * salon, what arrived. Accepting opens a discussion. Nothing here books, reserves or prices an
 * appointment, and the copy says so.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, Inbox, Send, X } from "lucide-react";

import { readAppSession, APP_SESSION_EVENT, type AppUserSession } from "@/lib/client-session";

export type DiscussionStatus = "requested" | "discussion_accepted" | "declined" | "withdrawn" | "expired";

export interface DiscussionRequestView {
  id: string;
  status: DiscussionStatus;
  note: string;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
  lookPostId: string | null;
  serviceId: string | null;
  providerName: string;
  clientName: string;
}

const STATUS_COPY: Record<DiscussionStatus, string> = {
  requested: "Waiting for a reply",
  discussion_accepted: "Discussion accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

const STATUS_TONE: Record<DiscussionStatus, string> = {
  requested: "border-[var(--color-clay)] text-[var(--text-primary)]",
  discussion_accepted: "border-[var(--color-sage)] text-[var(--text-primary)]",
  declined: "border-[var(--border-subtle)] text-[var(--text-secondary)]",
  withdrawn: "border-[var(--border-subtle)] text-[var(--text-secondary)]",
  expired: "border-[var(--border-subtle)] text-[var(--text-secondary)]",
};

function when(iso: string): string {
  const value = new Date(iso);
  return Number.isNaN(value.getTime())
    ? ""
    : value.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function useSession(): AppUserSession | null {
  const [session, setSession] = useState<AppUserSession | null>(null);
  useEffect(() => {
    const sync = () => setSession(readAppSession());
    sync();
    window.addEventListener(APP_SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(APP_SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return session;
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string; request?: DiscussionRequestView }
    | null;
  if (!response.ok || !data?.ok) throw new Error(data?.error || "That did not go through. Check your connection and try again.");
  return data;
}

export function RequestDiscussionButton({ workspaceId, name }: { workspaceId: string; name: string }) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    dialog.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!session || session.role !== "client") return null;

  async function send() {
    setBusy(true);
    setFailed(false);
    setMessage(null);
    try {
      await postJson("/api/discussion-requests", { providerWorkspaceId: workspaceId, note });
      setMessage(`Request sent. ${name} can accept a discussion. This is not a booking.`);
      setNote("");
      setOpen(false);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "That did not go through.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface-card)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-clay)]"
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        Ask to discuss
      </button>
      {message ? (
        <p
          role="status"
          className={`mt-2 text-xs leading-5 ${failed ? "text-[var(--color-danger,#B3261E)]" : "text-[var(--text-secondary)]"}`}
        >
          {message}
        </p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(13,27,42,0.55)] p-4 sm:items-center">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="discussion-request-title"
            className="w-full max-w-md rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[0_18px_60px_rgba(13,27,42,0.2)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="discussion-request-title" className="text-lg font-bold text-[var(--text-primary)]">
                  Ask {name} to discuss
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  A request to talk, not a booking. No date, price or slot is held.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <label htmlFor="discussion-request-note" className="mt-4 block text-xs font-semibold text-[var(--text-primary)]">
              What would you like to talk about?
            </label>
            <textarea
              id="discussion-request-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={600}
              rows={4}
              className="mt-2 w-full rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-clay)]"
              placeholder="For example, the service and the date range you have in mind."
            />
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{note.trim().length} of 600, at least 10</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={send}
                disabled={busy || note.trim().length < 10}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--color-action-primary)] px-5 text-sm font-bold text-[var(--color-action-primary-text)] disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send request"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
            {failed && message ? <p role="alert" className="mt-3 text-xs text-[var(--color-danger,#B3261E)]">{message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RequestCard({
  request,
  side,
  onDecide,
  busy,
}: {
  request: DiscussionRequestView;
  side: "sent" | "received";
  onDecide: (id: string, action: "accept" | "decline" | "withdraw") => void;
  busy: string | null;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[0_8px_22px_rgba(13,27,42,0.05)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_TONE[request.status]}`}>
          {STATUS_COPY[request.status]}
        </span>
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {side === "sent" ? request.providerName : request.clientName}
        </p>
        <span className="text-[11px] text-[var(--text-muted)]">{when(request.createdAt)}</span>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--text-secondary)]">{request.note}</p>
      {request.status === "discussion_accepted" ? (
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
          You can discuss this together. It is not an appointment, and no price is agreed.
        </p>
      ) : null}
      {request.status === "requested" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {side === "received" ? (
            <>
              <button
                type="button"
                disabled={busy === request.id}
                onClick={() => onDecide(request.id, "accept")}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--color-action-primary)] px-4 text-xs font-bold text-[var(--color-action-primary-text)] disabled:opacity-60"
              >
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                Accept discussion
              </button>
              <button
                type="button"
                disabled={busy === request.id}
                onClick={() => onDecide(request.id, "decline")}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-4 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-60"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
                Decline
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy === request.id}
              onClick={() => onDecide(request.id, "withdraw")}
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-4 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-60"
            >
              Withdraw
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function DiscussionRequestsPanel() {
  const session = useSession();
  const [sent, setSent] = useState<DiscussionRequestView[]>([]);
  const [received, setReceived] = useState<DiscussionRequestView[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const response = await fetch("/api/discussion-requests", { cache: "no-store" });
      if (response.status === 401) {
        setPhase("failed");
        setNotice("Sign in to see your requests.");
        return;
      }
      const data = (await response.json()) as { ok?: boolean; sent?: DiscussionRequestView[]; received?: DiscussionRequestView[] };
      if (!response.ok || !data.ok) throw new Error("Could not load your requests.");
      setSent(data.sent ?? []);
      setReceived(data.received ?? []);
      setPhase("ready");
    } catch {
      setPhase("failed");
      setNotice("Requests are unavailable right now. Check your connection, then try again.");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    void load();
  }, [session, load]);

  async function decide(id: string, action: "accept" | "decline" | "withdraw") {
    setBusy(id);
    setNotice(null);
    try {
      await postJson(`/api/discussion-requests/${id}`, { action });
      setNotice(action === "accept" ? "Discussion accepted. This is not an appointment." : action === "decline" ? "Request declined." : "Request withdrawn.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That did not go through.");
    } finally {
      setBusy(null);
    }
  }

  if (!session) return null;

  const isProvider = session.role === "professional" || session.role === "salon";

  if (phase === "loading") {
    return (
      <div role="status" className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 text-center">
        <Clock aria-hidden="true" className="mx-auto h-6 w-6 text-[var(--color-secondary)] opacity-60" />
        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Loading your requests.</p>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
        <p role="status" className="text-sm leading-6 text-[var(--text-secondary)]">
          {notice ?? "Requests are unavailable right now."}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-5 text-xs font-bold text-[var(--text-primary)]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice ? <p role="status" aria-live="polite" className="text-xs leading-5 text-[var(--text-secondary)]">{notice}</p> : null}

      {isProvider ? (
        <section aria-labelledby="received-requests">
          <h2 id="received-requests" className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Inbox aria-hidden="true" className="h-4 w-4" /> Received
          </h2>
          {received.length === 0 ? (
            <p className="mt-2 rounded-[20px] border border-dashed border-[var(--border-subtle)] p-4 text-xs leading-5 text-[var(--text-secondary)]">
              No requests yet. A client can ask to discuss from your profile in Compare.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              {received.map((request) => (
                <RequestCard key={request.id} request={request} side="received" onDecide={decide} busy={busy} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section aria-labelledby="sent-requests">
        <h2 id="sent-requests" className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Send aria-hidden="true" className="h-4 w-4" /> Sent
        </h2>
        {sent.length === 0 ? (
          <p className="mt-2 rounded-[20px] border border-dashed border-[var(--border-subtle)] p-4 text-xs leading-5 text-[var(--text-secondary)]">
            Nothing sent yet. Ask a provider to discuss from their profile, and the request will show here.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            {sent.map((request) => (
              <RequestCard key={request.id} request={request} side="sent" onDecide={decide} busy={busy} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
