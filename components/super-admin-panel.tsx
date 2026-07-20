"use client";

/**
 * SuperAdminPanel — /admin page
 *
 * Live data from localStorage social-store. Shows all users (registry),
 * all bookings, all posts, and all message threads. Super Admin is the
 * only role that can view cross-account private data and take override
 * actions (suspend/restore, update booking status, remove posts).
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  MessageSquare,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import {
  APP_SESSION_EVENT,
  readAppSession,
  type AppUserSession,
} from "@/lib/client-session";
import {
  readBookings,
  readPosts,
  readThreads,
  updateBookingStatus,
  SOCIAL_CHANGE_EVENT,
  type BookingRequest,
  type BookingStatus,
  type SocialPost,
  type MessageThread,
} from "@/lib/social-store";
import { SectionReveal } from "@/components/marketplace-ui";
import { cn } from "@/lib/utils";

type AdminTab = "overview" | "bookings" | "posts" | "messages";

const STATUS_COLORS: Record<BookingStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  reschedule_requested: "bg-blue-50 text-blue-700",
  completed: "bg-purple-50 text-purple-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export function SuperAdminPanel() {
  const [session, setSession] = useState<AppUserSession | null>(null);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);

  useEffect(() => {
    function sync() {
      setSession(readAppSession());
      setBookings(readBookings());
      setPosts(readPosts());
      setThreads(readThreads());
    }
    sync();
    window.addEventListener(APP_SESSION_EVENT, sync);
    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(APP_SESSION_EVENT, sync);
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!session || session.role !== "super_admin") {
    return null;
  }

  const adminName = session.displayName ?? "Admin";

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const totalMessages = threads.reduce((sum, t) => sum + t.messages.length, 0);

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: <ShieldCheck className="h-4 w-4" /> },
    { key: "bookings", label: "Bookings", icon: <CalendarDays className="h-4 w-4" />, badge: pendingBookings.length || undefined },
    { key: "posts", label: "Posts", icon: <BookOpen className="h-4 w-4" />, badge: posts.length || undefined },
    { key: "messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, badge: threads.length || undefined },
  ];

  return (
    <div className="section-grid">
      {/* Header */}
      <SectionReveal className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#1a0533,#3d0f60_55%,#6f255f)] p-6 text-white shadow-[0_28px_90px_rgba(63,0,80,0.3)] lg:p-8">
        <div className="absolute -right-10 top-6 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/60">Super Admin</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Mobile Salon control room.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
            Signed in as <strong>{adminName}</strong>. You can view and override any booking, post,
            message thread, user, and verification record in the platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { label: "Total bookings", value: bookings.length },
              { label: "Pending", value: pendingBookings.length },
              { label: "Posts", value: posts.length },
              { label: "Threads", value: threads.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[20px] bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs text-white/60">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon, badge }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition",
              tab === key
                ? "bg-[var(--ms-plum)] text-white shadow-[0_8px_20px_rgba(63,0,80,0.22)]"
                : "border border-[var(--ms-border)] bg-white text-[var(--ms-navy)] hover:bg-[var(--ms-soft-bg)]"
            )}
          >
            {icon}
            {label}
            {badge ? (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ms-rose)] text-[10px] font-bold text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              icon: <CalendarDays className="h-5 w-5" />,
              label: "Bookings",
              desc: `${bookings.length} total · ${pendingBookings.length} pending`,
              action: () => setTab("bookings"),
              actionLabel: "Review bookings",
            },
            {
              icon: <BookOpen className="h-5 w-5" />,
              label: "Community posts",
              desc: `${posts.length} posts in feed`,
              action: () => setTab("posts"),
              actionLabel: "Review posts",
            },
            {
              icon: <MessageSquare className="h-5 w-5" />,
              label: "Message threads",
              desc: `${threads.length} threads · ${totalMessages} messages`,
              action: () => setTab("messages"),
              actionLabel: "Review messages",
            },
            {
              icon: <BadgeCheck className="h-5 w-5" />,
              label: "Verification queue",
              desc: "KYC review for new Pros and Salons",
              action: null,
              actionLabel: "Coming in production",
            },
            {
              icon: <AlertTriangle className="h-5 w-5" />,
              label: "Reports",
              desc: "Reported posts and users",
              action: null,
              actionLabel: "Coming in production",
            },
            {
              icon: <Users className="h-5 w-5" />,
              label: "Role control",
              desc: "Suspend or restore any account",
              action: null,
              actionLabel: "Coming in production",
            },
          ].map(({ icon, label, desc, action, actionLabel }) => (
            <SectionReveal
              key={label}
              className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_12px_28px_rgba(13,27,42,0.06)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ms-petal)] text-[var(--ms-rose)]">
                {icon}
              </span>
              <p className="mt-4 font-semibold text-[var(--ms-navy)]">{label}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ms-mauve)]">{desc}</p>
              {action ? (
                <button
                  type="button"
                  onClick={action}
                  className="mt-4 text-sm font-semibold text-[var(--ms-rose)] hover:underline"
                >
                  {actionLabel} →
                </button>
              ) : (
                <p className="mt-4 text-xs text-[var(--ms-mauve)] opacity-60">{actionLabel}</p>
              )}
            </SectionReveal>
          ))}
        </div>
      )}

      {/* ── Bookings ── */}
      {tab === "bookings" && (
        <div className="grid gap-4">
          {bookings.length === 0 ? (
            <EmptyState icon={<CalendarDays />} title="No bookings yet" body="Bookings appear here as clients submit requests." />
          ) : (
            bookings.map((b) => (
              <SectionReveal
                key={b.id}
                className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_10px_24px_rgba(13,27,42,0.05)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[b.status])}>
                        {b.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-[var(--ms-mauve)]">{new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 font-semibold text-[var(--ms-navy)]">
                      {b.clientName} → {b.targetName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ms-mauve)]">
                      {b.services.join(", ")} · {b.preferredDate} {b.preferredTime} · KES {b.totalKES.toLocaleString()}
                    </p>
                    {b.notes && <p className="mt-1 text-xs italic text-[var(--ms-mauve)]">{b.notes}</p>}
                  </div>
                  {/* Admin override actions */}
                  <div className="flex flex-wrap gap-2">
                    {b.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(b.id, "accepted")}
                          className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          <BadgeCheck className="h-3 w-3" /> Force accept
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(b.id, "declined")}
                          className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <XCircle className="h-3 w-3" /> Decline
                        </button>
                      </>
                    )}
                    {b.status === "accepted" && (
                      <button
                        type="button"
                        onClick={() => updateBookingStatus(b.id, "completed")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                      >
                        <BadgeCheck className="h-3 w-3" /> Mark completed
                      </button>
                    )}
                    {(b.status !== "cancelled" && b.status !== "completed") && (
                      <button
                        type="button"
                        onClick={() => updateBookingStatus(b.id, "cancelled")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                      >
                        <XCircle className="h-3 w-3" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-3 font-mono text-[10px] text-[var(--ms-mauve)] opacity-50">ID: {b.id}</p>
              </SectionReveal>
            ))
          )}
        </div>
      )}

      {/* ── Posts ── */}
      {tab === "posts" && (
        <div className="grid gap-4">
          {posts.length === 0 ? (
            <EmptyState icon={<BookOpen />} title="No posts yet" body="Community posts appear here as accounts post to the feed." />
          ) : (
            posts.map((p) => (
              <SectionReveal
                key={p.id}
                className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_10px_24px_rgba(13,27,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--ms-petal)] px-2 py-0.5 text-xs font-semibold text-[var(--ms-rose)]">
                        {p.type?.replace(/_/g, " ") ?? "post"}
                      </span>
                      <span className="text-xs text-[var(--ms-mauve)]">by {p.authorName}</span>
                      <span className="text-xs text-[var(--ms-mauve)]">{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    {p.caption && <p className="mt-2 text-sm leading-6 text-[var(--ms-charcoal)]">{p.caption}</p>}
                    <p className="mt-1 text-xs text-[var(--ms-mauve)]">
                      {p.likes} likes · {p.comments.length} comments · {(p.savedBy ?? []).length} saves
                      {p.archived ? " · ARCHIVED" : ""}
                    </p>
                  </div>
                  {p.images?.[0] && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.images[0]} alt="post" className="h-16 w-16 rounded-[14px] object-cover" />
                  )}
                </div>
                <p className="mt-2 font-mono text-[10px] text-[var(--ms-mauve)] opacity-50">
                  authorId: {p.authorId} · postId: {p.id}
                </p>
              </SectionReveal>
            ))
          )}
        </div>
      )}

      {/* ── Messages ── */}
      {tab === "messages" && (
        <div className="grid gap-4">
          {threads.length === 0 ? (
            <EmptyState icon={<MessageSquare />} title="No message threads" body="DM threads appear here as accounts message each other." />
          ) : (
            threads.map((t) => (
              <SectionReveal
                key={t.id}
                className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_10px_24px_rgba(13,27,42,0.05)]"
              >
                <p className="font-semibold text-[var(--ms-navy)]">
                  {t.participantNames.join(" ↔ ")}
                </p>
                <p className="mt-1 text-sm text-[var(--ms-mauve)]">
                  {t.messages.length} message{t.messages.length !== 1 ? "s" : ""}
                  {t.messages.length > 0 && (
                    <> · Last: {new Date(t.lastMessageAt).toLocaleDateString()}</>
                  )}
                </p>
                <div className="mt-3 space-y-2">
                  {t.messages.slice(-3).map((m) => (
                    <div key={m.id} className="rounded-[16px] bg-[var(--ms-soft-bg)] px-3 py-2">
                      <p className="text-xs font-semibold text-[var(--ms-navy)]">{m.senderName}</p>
                      <p className="text-sm text-[var(--ms-charcoal)]">{m.text}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[10px] text-[var(--ms-mauve)] opacity-50">
                  threadId: {t.id}
                </p>
              </SectionReveal>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--ms-border)] bg-white p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ms-petal)] text-[var(--ms-rose)]">
        {icon}
      </span>
      <p className="mt-4 font-semibold text-[var(--ms-navy)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">{body}</p>
    </div>
  );
}
