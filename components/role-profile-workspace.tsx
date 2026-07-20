"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { showToast } from "@/lib/toast";
import { useEffect, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Crown,
  Globe2,
  Grid3X3,
  Heart,
  ImagePlus,
  LayoutPanelTop,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { ImageUploadEditor } from "@/components/image-upload-editor";
import { LanguagePreferenceCard } from "@/components/language-preference-card";
import { CTAButton, SectionReveal } from "@/components/marketplace-ui";
import { SalonTeamPanel, TeamMemberDashboard } from "@/components/salon-team-ui";
import { MyWorldCard } from "@/components/my-world-card";
import {
  APP_SESSION_EVENT,
  clearAppSession,
  readAppSession,
  writeAppSession,
  type AppUserSession,
  type ProfessionalUserProfile,
  type ProfileCardPreference,
  type SalonUserProfile,
} from "@/lib/client-session";
import {
  readSaves,
  readPosts,
  writePost,
  likePost,
  addComment,
  readThreads,
  markThreadRead,
  sendMessage,
  getClientBookings,
  getIncomingBookings,
  getAllProviderBookings,
  updateBookingStatus,
  SOCIAL_CHANGE_EVENT,
  type SocialPost,
  type SocialSaves,
  type SocialComment,
  type MessageThread,
  type BookingRequest,
} from "@/lib/social-store";
import { getProfessional, getSalon } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export function RoleProfileWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<AppUserSession | null>(null);

  useEffect(() => {
    function syncSession() {
      setSession(readAppSession());
    }

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener(APP_SESSION_EVENT, syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(APP_SESSION_EVENT, syncSession);
    };
  }, []);

  function save(next: AppUserSession) {
    setSession(next);
    writeAppSession(next);
  }

  if (!session) {
    return null;
  }

  // ── Standalone focused views (no profile header, no tab bar) ────────────────
  const tab = searchParams.get("tab");
  if (tab === "messages") return <MessagesOnlyView session={session} />;
  if (tab === "requests") return <RequestsOnlyView session={session} />;

  if (session.role === "client") {
    return <ClientProfileWorkspace session={session} onSave={save} />;
  }

  if (session.role === "salon") {
    return <SalonProfileWorkspace session={session} onSave={save} />;
  }

  if (session.role === "super_admin") {
    return <SuperAdminWorkspace />;
  }

  if (session.role === "shop" || session.role === "delivery") {
    return <OperationsProfilePrompt role={session.role} />;
  }

  if (session.role === "team_member") {
    return <TeamMemberDashboard session={session} />;
  }

  if (session.role !== "professional") {
    return <GuestProfilePrompt />;
  }

  return (
    <ProfessionalProfileWorkspace
      onDeleteDraft={() => {
        clearAppSession();
        router.push("/auth/sign-up");
      }}
      onSave={save}
      session={session}
    />
  );
}

// ── Standalone: Messages page (/profile?tab=messages) ────────────────────────

function MessagesOnlyView({ session }: { session: AppUserSession }) {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);
  const [dmText, setDmText] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Derive the ID used in thread participantIds
  const userId =
    session.role === "professional" ? (session as ProfessionalUserProfile).publicSlug
    : session.role === "salon"        ? (session as SalonUserProfile).publicSlug
    : session.role === "client"       ? session.id
    : session.role === "guest"        ? null
    : (session as { id?: string }).id ?? null;

  const displayName =
    session.role === "professional" ? (session as ProfessionalUserProfile).displayName
    : session.role === "salon"        ? (session as SalonUserProfile).salonName
    : session.role === "client"       ? session.firstName
    : "User";

  const avatar = session.role !== "guest" ? (session as { profilePhoto?: string }).profilePhoto : undefined;

  useEffect(() => {
    if (!userId) return;
    function sync() {
      const all = readThreads().filter((t) => t.participantIds.includes(userId!));
      setThreads(all);
      setActiveThread((cur) => (cur ? all.find((t) => t.id === cur.id) ?? null : null));
    }
    sync();
    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);

  if (!userId) return <GuestProfilePrompt />;

  const sortedThreads = [...threads].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  function handleSend() {
    if (!activeThread || !dmText.trim()) return;
    sendMessage(activeThread.id, {
      id: `msg_${Date.now()}`,
      text: dmText.trim(),
      senderId: userId!,
      senderName: displayName,
      senderAvatar: avatar,
      createdAt: new Date().toISOString(),
      read: false,
    });
    setDmText("");
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--ms-navy)]">Messages</h1>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="flex items-center justify-center rounded-full p-2 text-[var(--ms-mauve)] transition hover:text-[var(--ms-plum)]"
          title="Message settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {activeThread ? (
        /* ── Thread view ── */
        <div className="flex flex-col rounded-[24px] border border-[var(--ms-border)] bg-white shadow-[0_4px_16px_rgba(13,27,42,0.06)]">
          <div className="flex items-center gap-3 border-b border-[var(--ms-border)] p-4">
            <button
              type="button"
              onClick={() => setActiveThread(null)}
              className="rounded-full p-1.5 text-[var(--ms-mauve)] hover:text-[var(--ms-rose)]"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ms-petal)] text-sm font-bold text-[var(--ms-rose)]">
              {(activeThread.participantNames.find((n, i) => activeThread.participantIds[i] !== userId) ?? "?")[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ms-navy)]">
                {activeThread.participantNames.find((n, i) => activeThread.participantIds[i] !== userId) ?? "Unknown"}
              </p>
              <p className="text-xs text-[var(--ms-mauve)]">Protected platform chat</p>
            </div>
          </div>
          <div className="flex max-h-[420px] flex-col-reverse gap-2 overflow-y-auto p-4">
            {[...activeThread.messages].reverse().map((msg) => {
              const isMe = msg.senderId === userId;
              return (
                <div key={msg.id} className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-[18px] px-4 py-2.5 text-sm leading-6",
                      isMe
                        ? "bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-white"
                        : "bg-[var(--ms-soft-bg)] text-[var(--ms-charcoal)]",
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-end gap-2 border-t border-[var(--ms-border)] p-3">
            <textarea
              className="flex-1 resize-none rounded-[16px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2.5 text-sm leading-6 outline-none focus:border-[var(--ms-rose)]"
              rows={1}
              placeholder="Write a message…"
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-white shadow-[0_4px_12px_rgba(212,83,126,0.3)] hover:brightness-110"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ── Thread list ── */
        <div className="space-y-2">
          {sortedThreads.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--ms-border)] bg-white p-10 text-center shadow-[0_4px_16px_rgba(13,27,42,0.04)]">
              <MessageCircle className="mx-auto h-10 w-10 text-[var(--ms-mauve)] opacity-40" />
              <p className="mt-4 text-sm font-semibold text-[var(--ms-navy)]">No messages yet</p>
              <p className="mt-1 text-xs leading-6 text-[var(--ms-mauve)]">
                Book a service to start a conversation with a professional.
              </p>
              <Link
                href="/book"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--ms-petal)] px-5 py-2 text-sm font-semibold text-[var(--ms-rose)] hover:opacity-90"
              >
                Find a professional
              </Link>
            </div>
          ) : (
            sortedThreads.map((thread) => {
              const otherIdx = thread.participantIds.findIndex((id) => id !== userId);
              const otherName = thread.participantNames[otherIdx] ?? "Unknown";
              const lastMsg = thread.messages.at(-1);
              const unread = thread.messages.filter((m) => !m.read && m.senderId !== userId).length;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    markThreadRead(thread.id, userId);
                    setActiveThread(thread);
                  }}
                  className="flex w-full items-center gap-3 rounded-[20px] border border-[var(--ms-border)] bg-white p-4 text-left shadow-[0_2px_8px_rgba(13,27,42,0.04)] transition hover:border-[var(--ms-rose)]/30 hover:shadow-[0_4px_16px_rgba(13,27,42,0.08)]"
                >
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ms-petal)] text-base font-bold text-[var(--ms-rose)]">
                    {otherName[0]}
                    {unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--ms-rose)] text-[9px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-sm font-semibold", unread > 0 ? "text-[var(--ms-navy)]" : "text-[var(--ms-charcoal)]")}>
                        {otherName}
                      </p>
                      <p className="shrink-0 text-[10px] text-[var(--ms-mauve)]">
                        {lastMsg
                          ? new Date(lastMsg.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric" })
                          : ""}
                      </p>
                    </div>
                    <p className={cn("mt-0.5 truncate text-xs", unread > 0 ? "font-semibold text-[var(--ms-charcoal)]" : "text-[var(--ms-mauve)]")}>
                      {lastMsg
                        ? `${lastMsg.senderId === userId ? "You: " : ""}${lastMsg.text}`
                        : "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Message settings sheet */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-t-[32px] bg-white p-5 shadow-[0_-18px_60px_rgba(13,27,42,0.18)] sm:rounded-[32px]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--ms-navy)]">Message settings</h2>
                <p className="text-xs text-[var(--ms-mauve)]">Controls for this inbox only</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-full bg-[var(--ms-soft-bg)] p-2"
              >
                <X className="h-4 w-4 text-[var(--ms-mauve)]" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: "New message notifications",      desc: "Get notified when someone messages you",                      defaultOn: true  },
                { label: "Read receipts",                  desc: "Let others know when you've read their message",               defaultOn: true  },
                { label: "Allow messages from anyone",     desc: "When off, only people you've booked can message you",          defaultOn: false },
                { label: "Message previews",               desc: "Show the first line of the message in push notifications",     defaultOn: true  },
              ].map((item) => (
                <MiniToggleRow key={item.label} label={item.label} desc={item.desc} defaultOn={item.defaultOn} />
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-5 text-[var(--ms-mauve)]">
              Your phone number and address are never shared with other users inside messages.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Standalone: Requests page (/profile?tab=requests) ─────────────────────────

function RequestsOnlyView({ session }: { session: AppUserSession }) {
  const [showSettings, setShowSettings] = useState(false);

  if (session.role === "guest") return <GuestProfilePrompt />;

  const isProvider = session.role === "professional" || session.role === "salon";
  const providerSlug = isProvider
    ? (session as ProfessionalUserProfile | SalonUserProfile).publicSlug
    : null;
  const roleLabel = session.role === "professional" ? "Professional" : "Salon";

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--ms-navy)]">Requests</h1>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="flex items-center justify-center rounded-full p-2 text-[var(--ms-mauve)] transition hover:text-[var(--ms-plum)]"
          title="Request settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {isProvider && providerSlug ? (
        <ProviderRequestsPanel providerSlug={providerSlug} roleLabel={roleLabel} />
      ) : session.role === "client" ? (
        <ClientRequestsPanel session={session} />
      ) : (
        <GuestProfilePrompt />
      )}

      {/* Request settings sheet */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-t-[32px] bg-white p-5 shadow-[0_-18px_60px_rgba(13,27,42,0.18)] sm:rounded-[32px]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--ms-navy)]">Request settings</h2>
                <p className="text-xs text-[var(--ms-mauve)]">Booking notification preferences</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-full bg-[var(--ms-soft-bg)] p-2"
              >
                <X className="h-4 w-4 text-[var(--ms-mauve)]" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: "New booking requests",     desc: "Get notified when a client sends a booking request",        defaultOn: true },
                { label: "Booking status updates",   desc: "Notify when a booking is accepted, declined, or completed", defaultOn: true },
                { label: "Cancellation alerts",      desc: "Get notified if a client cancels a confirmed booking",      defaultOn: true },
                { label: "Appointment reminders",    desc: "Remind you 1 hour before an upcoming appointment",          defaultOn: true },
              ].map((item) => (
                <MiniToggleRow key={item.label} label={item.label} desc={item.desc} defaultOn={item.defaultOn} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Client outgoing bookings panel ────────────────────────────────────────────

function ClientRequestsPanel({
  session,
}: {
  session: Extract<AppUserSession, { role: "client" }>;
}) {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);

  useEffect(() => {
    function sync() {
      setBookings(getClientBookings(session.id));
    }
    sync();
    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [session.id]);

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[28px] border border-[var(--ms-border)] bg-white py-16 text-center shadow-[0_4px_16px_rgba(13,27,42,0.05)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ms-soft-bg)]">
          <CalendarDays className="h-8 w-8 text-[var(--ms-mauve)] opacity-50" />
        </div>
        <p className="mt-4 text-base font-semibold text-[var(--ms-navy)]">No booking requests yet</p>
        <p className="mt-2 max-w-xs text-sm text-[var(--ms-mauve)]">
          Choose a nearby professional or salon and your request will appear here.
        </p>
        <CTAButton href="/book" className="mt-5">Start a booking</CTAButton>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="rounded-[24px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_8px_22px_rgba(13,27,42,0.05)]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--ms-navy)]">{booking.targetName}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">{booking.services.join(", ")}</p>
              <p className="mt-2 text-xs font-semibold text-[var(--ms-charcoal)]">
                {booking.preferredDate} · {booking.preferredTime} · KES {booking.totalKES.toLocaleString()}
              </p>
            </div>
            <span
              className={cn(
                "w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize",
                STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-500",
              )}
            >
              {booking.status.replace(/_/g, " ")}
            </span>
          </div>
          {booking.notes && (
            <p className="mt-3 rounded-[18px] bg-[var(--ms-soft-bg)] px-4 py-3 text-xs leading-5 text-[var(--ms-mauve)]">
              {booking.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Mini toggle row (used in settings sheets) ─────────────────────────────────

function MiniToggleRow({
  label,
  desc,
  defaultOn,
}: {
  label: string;
  desc: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start gap-3 rounded-[16px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--ms-navy)]">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--ms-mauve)]">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        className={cn(
          "mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition",
          on ? "justify-end bg-[var(--ms-plum)]" : "justify-start bg-[var(--ms-border)]",
        )}
      >
        <span className="h-5 w-5 rounded-full bg-white" />
      </button>
    </div>
  );
}

// ── Client social profile ─────────────────────────────────────────────────────

type ClientTab = "posts" | "following" | "settings";

function ClientProfileWorkspace({
  session,
  onSave,
}: {
  session: Extract<AppUserSession, { role: "client" }>;
  onSave: (session: AppUserSession) => void;
}) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as ClientTab | null) ?? "posts";
  const [activeTab, setActiveTab] = useState<ClientTab>(
    (["posts", "following", "settings"] as ClientTab[]).includes(initialTab) ? initialTab : "posts"
  );
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [saves, setSaves] = useState<SocialSaves>({ professionals: [], salons: [] });
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostTag, setNewPostTag] = useState("before_after");
  const [expandedPost, setExpandedPost] = useState<SocialPost | null>(null);
  const [commentText, setCommentText] = useState("");
  const [editBio, setEditBio] = useState(session.bio ?? "");
  const [editUsername, setEditUsername] = useState(session.username ?? "");
  const [editFirstName, setEditFirstName] = useState(session.firstName);
  const [editPhone, setEditPhone] = useState(session.phone);
  const [editEmail, setEditEmail] = useState(session.email ?? "");
  const [editLocation, setEditLocation] = useState(session.location?.label ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function sync() {
      setPosts(readPosts().filter((p) => p.authorId === session.id));
      setSaves(readSaves());
    }
    sync();
    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [session.id]);

  async function handleSaveProfile() {
    setSaving(true);
    const next = {
      ...session,
      firstName: editFirstName,
      phone: editPhone,
      email: editEmail || undefined,
      bio: editBio || undefined,
      username: editUsername || undefined,
    };
    onSave(next);
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          bio: editBio || undefined,
          username: editUsername || undefined,
          location: editLocation || undefined,
        }),
      });
      showToast("Profile saved.", "success");
    } catch { showToast("Saved locally — will sync when online.", "info"); }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleAvatarSave(dataUrl: string) {
    onSave({ ...session, profilePhoto: dataUrl });
  }

  function handleCoverSave(dataUrl: string) {
    onSave({ ...session, coverPhoto: dataUrl } as typeof session);
  }

  function handlePublishPost() {
    if (!newPostCaption.trim() && newPostImages.length === 0) return;
    const post: SocialPost = {
      id: `post_${Date.now()}`,
      authorId: session.id,
      authorName: session.firstName,
      authorAvatar: session.profilePhoto,
      authorRole: "client",
      type: newPostTag as SocialPost["type"],
      images: newPostImages,
      caption: newPostCaption,
      tags: [],
      likes: 0,
      savedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    writePost(post);
    setNewPostImages([]);
    setNewPostCaption("");
    setShowNewPost(false);
    setPosts((prev) => [post, ...prev]);
  }

  function handleAddImage(dataUrl: string) {
    setNewPostImages((prev) => [...prev, dataUrl]);
  }

  function handleLike(postId: string) {
    likePost(postId, session.id);
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = p.savedBy.includes(session.id);
        return {
          ...p,
          likes: liked ? p.likes - 1 : p.likes + 1,
          savedBy: liked ? p.savedBy.filter((id) => id !== session.id) : [...p.savedBy, session.id],
        };
      }),
    );
  }

  function handleComment() {
    if (!expandedPost || !commentText.trim()) return;
    const comment: SocialComment = {
      id: `c_${Date.now()}`,
      authorId: session.id,
      authorName: session.firstName,
      authorAvatar: session.profilePhoto,
      text: commentText,
      createdAt: new Date().toISOString(),
    };
    addComment(expandedPost.id, comment);
    setExpandedPost((p) => p ? { ...p, comments: [...p.comments, comment] } : p);
    setCommentText("");
  }

  const followedPros = (saves.professionals ?? [])
    .map((slug) => getProfessional(slug))
    .filter(Boolean);
  const followedSalons = (saves.salons ?? [])
    .map((slug) => getSalon(slug))
    .filter(Boolean);

  const initials = session.firstName.slice(0, 1).toUpperCase();
  const coverBg = (session as typeof session & { coverPhoto?: string }).coverPhoto;
  const handle = (session as typeof session & { username?: string }).username;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* ── Cover photo ─────────────────────────────────────────────────────── */}
      <div className="relative h-44 overflow-hidden rounded-b-[0px] rounded-t-[32px] sm:h-52 lg:rounded-t-[40px]">
        {coverBg ? (
          <img src={coverBg} alt="Cover" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-rose),var(--ms-orchid))]" />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/10" />
        {/* Upload cover button */}
        <label className="absolute right-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur hover:bg-black/50">
          <Camera className="h-3.5 w-3.5" />
          Edit cover
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => { if (ev.target?.result) handleCoverSave(ev.target.result as string); };
            reader.readAsDataURL(file);
          }} />
        </label>
      </div>

      {/* ── Avatar + identity ───────────────────────────────────────────────── */}
      <div className="relative px-4 sm:px-6">
        {/* Avatar — overlaps cover */}
        <div className="relative -mt-12 w-fit">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[var(--ms-soft-bg)] shadow-[0_8px_24px_rgba(13,27,42,0.18)]">
            {session.profilePhoto ? (
              <img src={session.profilePhoto} alt={session.firstName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-3xl font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          {/* Camera overlay on avatar */}
          <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[var(--ms-rose)] text-white shadow-md hover:bg-[var(--ms-plum)]">
            <Camera className="h-3.5 w-3.5" />
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => { if (ev.target?.result) handleAvatarSave(ev.target.result as string); };
              reader.readAsDataURL(file);
            }} />
          </label>
        </div>

        {/* Name + handle + bio */}
        <div className="mt-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--ms-navy)]">{session.firstName}</h1>
              {handle && (
                <p className="mt-0.5 text-sm text-[var(--ms-mauve)]">@{handle}</p>
              )}
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--ms-petal)] px-3 py-1 text-[11px] font-semibold text-[var(--ms-rose)]">
                <Sparkles className="h-3 w-3" />
                {session.tribeBadge}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className="flex items-center gap-1.5 rounded-full border border-[var(--ms-border)] px-4 py-2 text-sm font-semibold text-[var(--ms-navy)] hover:border-[var(--ms-rose)] hover:text-[var(--ms-rose)]"
            >
              <Settings className="h-4 w-4" />
              Edit profile
            </button>
          </div>

          {(session as typeof session & { bio?: string }).bio && (
            <p className="mt-3 text-sm leading-6 text-[var(--ms-charcoal)]">
              {(session as typeof session & { bio?: string }).bio}
            </p>
          )}

          {session.location?.label && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--ms-mauve)]">
              <MapPin className="h-3.5 w-3.5" /> {session.location.label}
            </p>
          )}
        </div>

        {/* Stats bar */}
        <div className="mt-4 flex gap-6 border-b border-[var(--ms-border)] pb-4">
          {[
            { label: "Posts", value: posts.length },
            { label: "Following", value: followedPros.length + followedSalons.length },
            { label: "Saved", value: (saves.professionals?.length ?? 0) + (saves.salons?.length ?? 0) },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-bold text-[var(--ms-navy)]">{stat.value}</p>
              <p className="text-xs text-[var(--ms-mauve)]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs — Posts | Following | Settings gear */}
        <div className="mt-0 flex items-center border-b border-[var(--ms-border)]">
          {(
            [
              { key: "posts",     label: "Posts",     icon: <Grid3X3 className="h-4 w-4" /> },
              { key: "following", label: "Following", icon: <Users className="h-4 w-4" /> },
            ] as { key: ClientTab; label: string; icon: ReactNode }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-semibold transition",
                activeTab === tab.key
                  ? "border-[var(--ms-rose)] text-[var(--ms-rose)]"
                  : "border-transparent text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]",
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
          {/* Settings gear icon — not a full tab */}
          <Link
            href="/settings"
            className="ml-auto flex items-center justify-center border-b-2 border-transparent px-4 py-3 text-[var(--ms-mauve)] transition hover:text-[var(--ms-plum)]"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        {/* ── Posts tab ────────────────────────────────────────────────────── */}
        {activeTab === "posts" && (
          <div className="mt-5">
            {/* New post CTA */}
            <button
              type="button"
              onClick={() => setShowNewPost(true)}
              className="mb-5 flex w-full items-center gap-3 rounded-[24px] border-2 border-dashed border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-5 py-4 text-left transition hover:border-[var(--ms-rose)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-white">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--ms-navy)]">Share your beauty moment</p>
                <p className="text-xs text-[var(--ms-mauve)]">Before/after, inspo, tips — share it with the community</p>
              </div>
            </button>

            {posts.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ms-soft-bg)]">
                  <ImagePlus className="h-8 w-8 text-[var(--ms-mauve)] opacity-50" />
                </div>
                <p className="mt-4 text-base font-semibold text-[var(--ms-navy)]">Your beauty board is empty</p>
                <p className="mt-2 text-sm text-[var(--ms-mauve)]">Share your first before/after or beauty inspiration.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setExpandedPost(post)}
                    className="group relative aspect-square overflow-hidden rounded-[12px] bg-[var(--ms-soft-bg)]"
                  >
                    {post.images[0] ? (
                      <img
                        src={post.images[0]}
                        alt={post.caption}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--ms-petal),var(--ms-soft-bg))]">
                        <Sparkles className="h-8 w-8 text-[var(--ms-rose)] opacity-40" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <Heart className="h-4 w-4" /> {post.likes}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <MessageCircle className="h-4 w-4" /> {post.comments.length}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Following tab ────────────────────────────────────────────────── */}
        {activeTab === "following" && (
          <div className="mt-5 space-y-4">
            {followedPros.length === 0 && followedSalons.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ms-soft-bg)]">
                  <Users className="h-8 w-8 text-[var(--ms-mauve)] opacity-50" />
                </div>
                <p className="mt-4 text-base font-semibold text-[var(--ms-navy)]">No one saved yet</p>
                <p className="mt-2 text-sm text-[var(--ms-mauve)]">Visit a professional or salon and tap Follow to add them here.</p>
                <CTAButton href="/home" className="mt-5">Browse the marketplace</CTAButton>
              </div>
            ) : (
              <>
                {followedPros.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Professionals</p>
                    <div className="space-y-3">
                      {followedPros.map((pro) => pro && (
                        <div key={pro.slug} className="flex items-center gap-3 rounded-[20px] border border-[var(--ms-border)] bg-white p-3 shadow-[0_2px_8px_rgba(13,27,42,0.04)]">
                          <div
                            className="h-12 w-12 shrink-0 rounded-full bg-[var(--ms-soft-bg)] bg-cover bg-center"
                            style={{ backgroundImage: pro.image ? `url(${pro.image.url})` : undefined }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--ms-navy)]">{pro.name}</p>
                            <p className="truncate text-xs text-[var(--ms-mauve)]">{pro.specialty} · {pro.location}</p>
                          </div>
                          <Link href={`/professionals/${pro.slug}`} className="shrink-0 rounded-full border border-[var(--ms-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ms-plum)] hover:border-[var(--ms-rose)] hover:text-[var(--ms-rose)]">
                            View
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {followedSalons.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Salons</p>
                    <div className="space-y-3">
                      {followedSalons.map((salon) => salon && (
                        <div key={salon.slug} className="flex items-center gap-3 rounded-[20px] border border-[var(--ms-border)] bg-white p-3 shadow-[0_2px_8px_rgba(13,27,42,0.04)]">
                          <div
                            className="h-12 w-12 shrink-0 rounded-full bg-[var(--ms-soft-bg)] bg-cover bg-center"
                            style={{ backgroundImage: salon.image ? `url(${salon.image.url})` : undefined }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--ms-navy)]">{salon.name}</p>
                            <p className="truncate text-xs text-[var(--ms-mauve)]">{salon.location}</p>
                          </div>
                          <Link href={`/salons/${salon.slug}`} className="shrink-0 rounded-full border border-[var(--ms-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ms-plum)] hover:border-[var(--ms-rose)] hover:text-[var(--ms-rose)]">
                            View
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Settings tab ─────────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="mt-5 space-y-4">
            {/* Full settings card */}
            <Link
              href="/settings"
              className="flex items-center gap-4 rounded-[22px] bg-[linear-gradient(135deg,var(--ms-plum),#7C3A6F)] px-5 py-4 text-white shadow-[0_6px_24px_rgba(132,36,92,0.2)] transition hover:brightness-105"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/20">
                <Settings className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-bold">Full Settings</p>
                <p className="text-[11px] text-white/70">Privacy, notifications, Counter, security &amp; more</p>
              </div>
              <svg className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </Link>

            <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_4px_16px_rgba(13,27,42,0.06)]">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Profile</p>
              <div className="space-y-3">
                <EditField label="First name" value={editFirstName} onChange={setEditFirstName} icon={<UserRound className="h-4 w-4" />} />
                <EditField label="Username / handle" value={editUsername} onChange={setEditUsername} placeholder="e.g. njeri_beauty" icon={<Crown className="h-4 w-4" />} />
                <EditField label="Phone" value={editPhone} onChange={setEditPhone} type="tel" icon={<Phone className="h-4 w-4" />} />
                <EditField label="Email" value={editEmail} onChange={setEditEmail} type="email" icon={<Mail className="h-4 w-4" />} />
                <EditField label="Location" value={editLocation} onChange={setEditLocation} placeholder="e.g. Kilimani" icon={<MapPin className="h-4 w-4" />} />
                <div>
                  <label className="block rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
                    <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
                      <MessageSquare className="h-3.5 w-3.5" /> Bio / beauty story
                    </span>
                    <textarea
                      className="mt-2 w-full resize-none bg-transparent text-sm leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-border)]"
                      rows={3}
                      placeholder="Tell the community about your beauty journey, favourite styles, or what inspires you..."
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                    />
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {saved ? "Saved ✓" : saving ? "Saving…" : "Save profile"}
              </button>
            </div>

            <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_4px_16px_rgba(13,27,42,0.06)]">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Privacy</p>
              {[
                { icon: <Lock className="h-4 w-4" />, label: "Contact privacy", value: "Hidden until booking confirmed" },
                { icon: <Bell className="h-4 w-4" />, label: "Notifications", value: "On" },
                { icon: <ShieldCheck className="h-4 w-4" />, label: "Safe space mode", value: "Active" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 text-sm text-[var(--ms-charcoal)]">
                    <span className="text-[var(--ms-rose)]">{row.icon}</span>
                    {row.label}
                  </div>
                  <span className="rounded-full bg-[var(--ms-soft-bg)] px-3 py-1 text-xs font-semibold text-[var(--ms-mauve)]">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Quick links</p>
              <div className="flex flex-wrap gap-2">
                <CTAButton href="/home" variant="outline" className="text-sm">Explore marketplace</CTAButton>
                <CTAButton href="/book" variant="outline" className="text-sm">Book a service</CTAButton>
                <CTAButton href="/activity" variant="outline" className="text-sm">My activity</CTAButton>
              </div>
            </div>

            <MyWorldCard />
            <LanguagePreferenceCard />
          </div>
        )}
      </div>

      {/* ── New post modal ───────────────────────────────────────────────────── */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-t-[32px] bg-white p-5 shadow-[0_-18px_60px_rgba(13,27,42,0.18)] sm:rounded-[32px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--ms-navy)]">Share a moment</h2>
              <button type="button" onClick={() => setShowNewPost(false)} className="rounded-full bg-[var(--ms-soft-bg)] p-2 text-[var(--ms-mauve)] hover:text-[var(--ms-rose)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type selector */}
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { key: "before_after", label: "Before/After" },
                { key: "inspo", label: "Inspiration" },
                { key: "tip", label: "Beauty Tip" },
                { key: "portfolio", label: "My Look" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setNewPostTag(t.key)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    newPostTag === t.key
                      ? "bg-[var(--ms-rose)] text-white"
                      : "bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Image upload area */}
            <ImageUploadEditor
              label="Add photo(s)"
              requirements="JPG or PNG · max 5 MB"
              aspectHint="Square 1:1 works best for the feed"
              maxMB={5}
              value={newPostImages[0]}
              onSave={(url) => handleAddImage(url)}
            />

            {/* Caption */}
            <textarea
              className="mt-3 w-full resize-none rounded-[16px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
              rows={3}
              placeholder="Write a caption, tip, or story…"
              value={newPostCaption}
              onChange={(e) => setNewPostCaption(e.target.value)}
            />

            <button
              type="button"
              onClick={handlePublishPost}
              disabled={!newPostCaption.trim() && newPostImages.length === 0}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> Share to community
            </button>
          </div>
        </div>
      )}

      {/* ── Post detail modal ────────────────────────────────────────────────── */}
      {expandedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(13,27,42,0.28)]">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[var(--ms-border)] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-sm font-bold text-white">
                {expandedPost.authorName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--ms-navy)]">{expandedPost.authorName}</p>
                <p className="text-xs text-[var(--ms-mauve)]">{new Date(expandedPost.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <button type="button" onClick={() => setExpandedPost(null)} className="rounded-full bg-[var(--ms-soft-bg)] p-2">
                <X className="h-4 w-4 text-[var(--ms-mauve)]" />
              </button>
            </div>
            {/* Image */}
            {expandedPost.images[0] && (
              <img src={expandedPost.images[0]} alt="Post" className="max-h-64 w-full object-cover" />
            )}
            {/* Caption + actions */}
            <div className="border-b border-[var(--ms-border)] p-4">
              <p className="text-sm leading-6 text-[var(--ms-charcoal)]">{expandedPost.caption}</p>
              <div className="mt-3 flex items-center gap-4">
                <button type="button" onClick={() => handleLike(expandedPost.id)} className={cn("flex items-center gap-1.5 text-sm font-semibold transition", expandedPost.savedBy.includes(session.id) ? "text-[var(--ms-rose)]" : "text-[var(--ms-mauve)]")}>
                  <Heart className="h-4 w-4" fill={expandedPost.savedBy.includes(session.id) ? "currentColor" : "none"} />
                  {expandedPost.likes}
                </button>
                <span className="flex items-center gap-1.5 text-sm text-[var(--ms-mauve)]">
                  <MessageCircle className="h-4 w-4" />
                  {expandedPost.comments.length} comments
                </span>
              </div>
            </div>
            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {expandedPost.comments.length === 0 && (
                <p className="text-center text-xs text-[var(--ms-mauve)]">No comments yet. Be first to cheer!</p>
              )}
              {expandedPost.comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-xs font-bold text-[var(--ms-plum)]">
                    {c.authorName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 rounded-[14px] bg-[var(--ms-soft-bg)] px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--ms-navy)]">{c.authorName}</p>
                    <p className="text-xs leading-5 text-[var(--ms-charcoal)]">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Comment input */}
            <div className="flex gap-2 border-t border-[var(--ms-border)] p-3">
              <input
                className="flex-1 rounded-full border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2 text-sm outline-none placeholder:text-[var(--ms-mauve)]"
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
              />
              <button type="button" onClick={handleComment} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ms-rose)] text-white hover:bg-[var(--ms-plum)]">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit field atom ───────────────────────────────────────────────────────────

function EditField({
  label,
  value,
  onChange,
  icon,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: ReactNode;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
        {icon} {label}
      </span>
      <input
        type={type}
        className="mt-2 w-full bg-transparent text-sm font-semibold text-[var(--ms-navy)] outline-none placeholder:font-normal placeholder:text-[var(--ms-border)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

// ── Shared social-profile workspace for Professional and Salon ────────────────
// Both roles get the same Instagram-style shell — only the data fields differ.

type ProviderTab = "posts" | "team" | "settings";

function ProviderProfileWorkspace({
  session,
  onSave,
  onDeleteDraft,
}: {
  session: ProfessionalUserProfile | SalonUserProfile;
  onSave: (s: AppUserSession) => void;
  onDeleteDraft?: () => void;
}) {
  const searchParams = useSearchParams();
  const initTab = (searchParams.get("tab") as ProviderTab | null) ?? "posts";
  const [activeTab, setActiveTab] = useState<ProviderTab>(
    (["posts", "team", "settings"] as ProviderTab[]).includes(initTab) ? initTab : "posts",
  );

  const isPro    = session.role === "professional";
  const proSess  = isPro ? (session as ProfessionalUserProfile) : null;
  const salonSess= !isPro ? (session as SalonUserProfile) : null;

  const displayName  = isPro ? proSess!.displayName   : salonSess!.salonName;
  const subtitle     = isPro ? proSess!.specialty      : "Salon";
  const publicSlug   = isPro ? proSess!.publicSlug     : salonSess!.publicSlug;
  const coverPhoto   = (session as { coverPhoto?: string }).coverPhoto;
  const initials     = displayName.slice(0, 1).toUpperCase();

  // Posts by this provider
  const [posts,    setPosts]    = useState<SocialPost[]>([]);
  const [pending,  setPending]  = useState<BookingRequest[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newCaption, setNewCaption] = useState("");
  const [newTag, setNewTag] = useState("portfolio");
  const [expandedPost, setExpandedPost] = useState<SocialPost | null>(null);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Settings edit state
  const [editDisplayName, setEditDisplayName] = useState(displayName);
  const [editSubtitle, setEditSubtitle]       = useState(subtitle);
  const [editPhone, setEditPhone]             = useState(session.phone);
  const [editEmail, setEditEmail]             = useState(session.email ?? "");
  const [editLocation, setEditLocation]       = useState(isPro ? proSess!.location : salonSess!.location);
  const [editBio, setEditBio]                 = useState(isPro ? proSess!.bio : (salonSess as { description?: string })?.description ?? "");

  useEffect(() => {
    function sync() {
      setPosts(readPosts().filter((p) => p.authorId === session.id));
      setPending(getIncomingBookings(publicSlug));
    }
    sync();
    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [session.id, publicSlug]);

  function handleAvatarSave(dataUrl: string) {
    onSave({ ...session, profilePhoto: dataUrl });
  }

  function handleCoverSave(dataUrl: string) {
    onSave({ ...session, coverPhoto: dataUrl } as unknown as typeof session);
  }

  function handlePublishPost() {
    if (!newCaption.trim() && newImages.length === 0) return;
    const authorRole: SocialPost["authorRole"] = isPro ? "professional" : "salon";
    const post: SocialPost = {
      id: `post_${Date.now()}`,
      authorId: session.id,
      authorSlug: publicSlug,  // enables direct "Book" links from the social feed
      authorName: displayName,
      authorAvatar: session.profilePhoto,
      authorRole,
      type: newTag as SocialPost["type"],
      images: newImages,
      caption: newCaption,
      tags: newCaption.match(/#\w+/g) ?? [],
      likes: 0,
      savedBy: [],
      bookmarkedBy: [],
      repostedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    writePost(post);
    setPosts((prev) => [post, ...prev]);
    setNewImages([]);
    setNewCaption("");
    setShowNewPost(false);
  }

  function handleLike(postId: string) {
    likePost(postId, session.id);
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = p.savedBy.includes(session.id);
        return { ...p, likes: liked ? p.likes - 1 : p.likes + 1, savedBy: liked ? p.savedBy.filter((id) => id !== session.id) : [...p.savedBy, session.id] };
      }),
    );
  }

  function handleComment() {
    if (!expandedPost || !commentText.trim()) return;
    const comment: SocialComment = { id: `c_${Date.now()}`, authorId: session.id, authorName: displayName, authorAvatar: session.profilePhoto, text: commentText, createdAt: new Date().toISOString() };
    addComment(expandedPost.id, comment);
    setExpandedPost((p) => p ? { ...p, comments: [...p.comments, comment] } : p);
    setCommentText("");
  }

  async function handleSaveSettings() {
    setSaving(true);
    const next: AppUserSession = isPro
      ? { ...session, displayName: editDisplayName, specialty: editSubtitle, phone: editPhone, email: editEmail || undefined, location: editLocation, bio: editBio } as AppUserSession
      : { ...session, salonName: editDisplayName, phone: editPhone, email: editEmail || undefined, location: editLocation, description: editBio } as AppUserSession;
    onSave(next);
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isPro
          ? { displayName: editDisplayName, specialty: editSubtitle, bio: editBio, location: editLocation }
          : { salonName: editDisplayName, bio: editBio, location: editLocation }),
      });
      showToast("Profile saved.", "success");
    } catch { showToast("Saved locally — will sync when online.", "info"); }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }


  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* ── Cover ───────────────────────────────────────────────────────── */}
      <div className="relative h-44 overflow-hidden rounded-b-[0px] rounded-t-[32px] sm:h-52 lg:rounded-t-[40px]">
        {coverPhoto ? (
          <img src={coverPhoto} alt="Cover" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,var(--ms-plum),#6B3FA0,var(--ms-orchid))]" />
        )}
        <div className="absolute inset-0 bg-black/10" />
        <label className="absolute right-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur hover:bg-black/50">
          <Camera className="h-3.5 w-3.5" /> Edit cover
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const r = new FileReader(); r.onload = (ev) => { if (ev.target?.result) handleCoverSave(ev.target.result as string); }; r.readAsDataURL(file);
          }} />
        </label>
        {/* Status chip */}
        <div className="absolute bottom-3 left-4">
          <span className={cn("rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide",
            (isPro ? proSess!.listingPublished : salonSess!.listingPublished)
              ? "bg-emerald-500/90 text-white" : "bg-black/50 text-white/80")}>
            {(isPro ? proSess!.listingPublished : salonSess!.listingPublished) ? "● Live" : "● Draft"}
          </span>
        </div>
      </div>

      {/* ── Identity ────────────────────────────────────────────────────── */}
      <div className="relative px-4 sm:px-6">
        <div className="relative -mt-12 flex items-end justify-between">
          <div className="relative">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[var(--ms-soft-bg)] shadow-[0_8px_24px_rgba(13,27,42,0.18)]">
              {session.profilePhoto ? (
                <img src={session.profilePhoto} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-3xl font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[var(--ms-plum)] text-white shadow-md hover:bg-[var(--ms-orchid)]">
              <Camera className="h-3.5 w-3.5" />
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                const file = e.target.files?.[0]; if (!file) return;
                const r = new FileReader(); r.onload = (ev) => { if (ev.target?.result) handleAvatarSave(ev.target.result as string); }; r.readAsDataURL(file);
              }} />
            </label>
          </div>
          <div className="flex shrink-0 gap-2 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className="flex items-center gap-1.5 rounded-full border border-[var(--ms-border)] px-4 py-2 text-sm font-semibold text-[var(--ms-navy)] hover:border-[var(--ms-plum)] hover:text-[var(--ms-plum)]"
            >
              <Settings className="h-4 w-4" /> Edit Profile
            </button>
            {isPro && (
              <a
                href={`/professionals/${publicSlug}`}
                className="flex items-center gap-1.5 rounded-full bg-[var(--ms-petal)] px-4 py-2 text-sm font-semibold text-[var(--ms-plum)] hover:bg-[var(--ms-plum)] hover:text-white"
              >
                Preview
              </a>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--ms-navy)]">{displayName}</h1>
            {isPro && proSess!.specialty && (
              <span className="rounded-full bg-[var(--ms-petal)] px-3 py-1 text-[11px] font-semibold text-[var(--ms-plum)]">
                <Sparkles className="mr-1 inline-block h-3 w-3" />{proSess!.specialty}
              </span>
            )}
          </div>
          {(isPro ? proSess!.location : salonSess!.location) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--ms-mauve)]">
              <MapPin className="h-3.5 w-3.5" />
              {isPro ? proSess!.location : salonSess!.location}
            </p>
          )}
          {/* Bio / description — visible directly on profile header */}
          {(isPro ? proSess!.bio : (salonSess as SalonUserProfile & { description?: string })?.description) && (
            <p className="mt-2 text-sm leading-6 text-[var(--ms-navy)]">
              {isPro ? proSess!.bio : (salonSess as SalonUserProfile & { description?: string })?.description}
            </p>
          )}
        </div>

        {/* Stats bar */}
        <div className="mt-4 flex gap-6 border-b border-[var(--ms-border)] pb-4">
          {[
            { label: "Posts",   value: posts.length },
            { label: "Pending", value: pending.length },
            {
              label: isPro ? "Mode" : "Team",
              // Guard against undefined — serviceMode/teamCount may not be set on new accounts
              value: isPro
                ? (proSess!.serviceMode ?? "—")
                : `${salonSess!.teamCount ?? 1}`,
            },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-bold text-[var(--ms-navy)]">{stat.value}</p>
              <p className="text-xs text-[var(--ms-mauve)]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs — Posts | [Team if salon] | Settings gear */}
        <div className="mt-0 flex items-center border-b border-[var(--ms-border)]">
          {(
            [
              { key: "posts", label: "Posts",  icon: <Grid3X3 className="h-4 w-4" />, salonOnly: false },
              { key: "team",  label: "Team",   icon: <Users className="h-4 w-4" />,   salonOnly: true  },
            ] as { key: ProviderTab; label: string; icon: ReactNode; salonOnly: boolean }[]
          )
            .filter((t) => !t.salonOnly || !isPro)
            .map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-semibold transition",
                  activeTab === t.key
                    ? "border-[var(--ms-plum)] text-[var(--ms-plum)]"
                    : "border-transparent text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]",
                )}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          {/* Settings gear icon — links to /settings page */}
          <Link
            href="/settings"
            className="ml-auto flex items-center justify-center border-b-2 border-transparent px-4 py-3 text-[var(--ms-mauve)] transition hover:text-[var(--ms-plum)]"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        {/* ── Posts tab ──────────────────────────────────────────────── */}
        {activeTab === "posts" && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowNewPost(true)}
              className="mb-5 flex w-full items-center gap-3 rounded-[24px] border-2 border-dashed border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-5 py-4 text-left transition hover:border-[var(--ms-plum)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-white">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--ms-navy)]">Share your work</p>
                <p className="text-xs text-[var(--ms-mauve)]">Portfolio, tutorials, before/after, promotions</p>
              </div>
            </button>

            {posts.length === 0 ? (
              /* ── First-time onboarding checklist ─────────────────────── */
              <div className="space-y-3">
                {/* Header card */}
                <div className="rounded-[24px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] px-5 py-5 text-white">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Get started</p>
                  <h3 className="mt-1 text-xl font-bold">4 steps to your first booking</h3>
                  <p className="mt-1 text-[13px] text-white/75">Clients discover you through your posts. Here&apos;s how to get found.</p>
                </div>
                {/* Checklist steps */}
                {[
                  {
                    step: 1,
                    title: "Create your account",
                    sub: "Done! You're in.",
                    done: true,
                    action: null,
                  },
                  {
                    step: 2,
                    title: "Complete your profile",
                    sub: session.profilePhoto && (isPro ? proSess!.bio : (salonSess as SalonUserProfile & { description?: string })?.description)
                      ? "Profile looking great!"
                      : "Add your photo, bio and location so clients trust you",
                    done: Boolean(session.profilePhoto && (isPro ? proSess!.bio : (salonSess as SalonUserProfile & { description?: string })?.description)),
                    action: { label: "Edit Profile", tab: "settings" as ProviderTab },
                  },
                  {
                    step: 3,
                    title: "Share your first post",
                    sub: "Upload a before/after or portfolio photo — this is how clients find you",
                    done: posts.length > 0,
                    action: null, // handled by compose button above
                  },
                  {
                    step: 4,
                    title: "Publish your listing",
                    sub: (isPro ? proSess!.listingPublished : salonSess!.listingPublished)
                      ? "You're live — clients can discover and book you!"
                      : "Go live so clients can discover and book you",
                    done: Boolean(isPro ? proSess!.listingPublished : salonSess!.listingPublished),
                    action: { label: "Go Live", tab: "settings" as ProviderTab },
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className={cn(
                      "flex items-start gap-4 rounded-[20px] border px-4 py-4 transition",
                      item.done
                        ? "border-[var(--ms-emerald)]/30 bg-[var(--ms-emerald)]/5"
                        : "border-[var(--ms-border)] bg-white",
                    )}
                  >
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                      item.done
                        ? "bg-[var(--ms-emerald)] text-white"
                        : "bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)]",
                    )}>
                      {item.done ? <Check className="h-4 w-4" /> : item.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[14px] font-semibold", item.done ? "text-[var(--ms-emerald)]" : "text-[var(--ms-navy)]")}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-5 text-[var(--ms-mauve)]">{item.sub}</p>
                    </div>
                    {!item.done && item.action && (
                      <button
                        type="button"
                        onClick={() => setActiveTab(item.action!.tab)}
                        className="shrink-0 rounded-full bg-[var(--ms-plum)] px-3 py-1.5 text-[11px] font-bold text-white transition hover:brightness-110"
                      >
                        {item.action.label}
                      </button>
                    )}
                    {!item.done && !item.action && item.step === 3 && (
                      <button
                        type="button"
                        onClick={() => setShowNewPost(true)}
                        className="shrink-0 rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] px-3 py-1.5 text-[11px] font-bold text-white transition hover:brightness-110"
                      >
                        Post now
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setExpandedPost(post)}
                    className="group relative aspect-square overflow-hidden rounded-[12px] bg-[var(--ms-soft-bg)]"
                  >
                    {post.images[0] ? (
                      <img src={post.images[0]} alt={post.caption} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--ms-petal),var(--ms-soft-bg))]">
                        <Sparkles className="h-8 w-8 text-[var(--ms-plum)] opacity-40" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                      <span className="flex items-center gap-1 text-xs font-bold"><Heart className="h-4 w-4" /> {post.likes}</span>
                      <span className="flex items-center gap-1 text-xs font-bold"><MessageCircle className="h-4 w-4" /> {post.comments.length}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Team tab (salon only) ───────────────────────────────────── */}
        {activeTab === "team" && !isPro && salonSess && (
          <SalonTeamPanel
            session={salonSess}
            onSave={(s) => onSave(s as AppUserSession)}
          />
        )}

        {/* ── Settings tab ───────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="mt-5 space-y-4">
            {/* Publish toggle card */}
            <div className="rounded-[22px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_4px_16px_rgba(13,27,42,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[var(--ms-navy)]">Marketplace listing</p>
                  <p className="text-xs text-[var(--ms-mauve)]">
                    {(isPro ? proSess!.listingPublished : salonSess!.listingPublished)
                      ? "Clients can discover and book you"
                      : "Hidden — clients cannot find you yet"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSave({ ...session, listingPublished: !(isPro ? proSess!.listingPublished : salonSess!.listingPublished) })}
                  className={cn(
                    "flex h-7 w-12 items-center rounded-full p-1 transition",
                    (isPro ? proSess!.listingPublished : salonSess!.listingPublished) ? "justify-end bg-[var(--ms-plum)]" : "justify-start bg-[var(--ms-border)]",
                  )}
                >
                  <span className="h-5 w-5 rounded-full bg-white" />
                </button>
              </div>
              {isPro && (
                <a href={`/professionals/${publicSlug}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ms-plum)] hover:underline">
                  Preview your public page →
                </a>
              )}
            </div>

            {/* Edit fields */}
            <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_4px_16px_rgba(13,27,42,0.06)]">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
                {isPro ? "Professional details" : "Salon details"}
              </p>
              <div className="space-y-3">
                <EditField label={isPro ? "Display name" : "Salon name"} value={editDisplayName} onChange={setEditDisplayName} icon={<UserRound className="h-4 w-4" />} />
                {isPro && <EditField label="Specialty" value={editSubtitle} onChange={setEditSubtitle} icon={<Sparkles className="h-4 w-4" />} />}
                <EditField label="Phone" value={editPhone} onChange={setEditPhone} type="tel" icon={<Phone className="h-4 w-4" />} />
                <EditField label="Email" value={editEmail} onChange={setEditEmail} type="email" icon={<Mail className="h-4 w-4" />} />
                <EditField label="Location" value={editLocation} onChange={setEditLocation} icon={<MapPin className="h-4 w-4" />} />
                <div>
                  <label className="block rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
                    <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
                      <MessageSquare className="h-3.5 w-3.5" /> {isPro ? "Bio" : "Salon description"}
                    </span>
                    <textarea
                      className="mt-2 w-full resize-none bg-transparent text-sm leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-border)]"
                      rows={3}
                      placeholder={isPro ? "Describe your expertise and style…" : "Tell clients what makes your salon special…"}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                    />
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {saved ? "Saved ✓" : saving ? "Saving…" : "Save profile"}
              </button>
            </div>

            {/* Cards section */}
            {session.cards && session.cards.length > 0 && (
              <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Public page sections</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {session.cards.map((card) => (
                    <CardPreferenceRow
                      card={card}
                      key={card.id}
                      onRemove={card.removable ? () => onSave({ ...session, cards: session.cards.filter((c) => c.id !== card.id) }) : undefined}
                      onToggle={() => onSave({ ...session, cards: session.cards.map((c) => c.id === card.id ? { ...c, enabled: !c.enabled } : c) })}
                    />
                  ))}
                </div>
              </div>
            )}

            {onDeleteDraft && (
              <button
                type="button"
                onClick={onDeleteDraft}
                className="w-full rounded-[16px] border border-red-200 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Delete draft account
              </button>
            )}
            <MyWorldCard />
            <LanguagePreferenceCard />
          </div>
        )}
      </div>

      {/* New post modal */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-t-[32px] bg-white p-5 shadow-[0_-18px_60px_rgba(13,27,42,0.18)] sm:rounded-[32px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--ms-navy)]">Share your work</h2>
              <button type="button" onClick={() => setShowNewPost(false)} className="rounded-full bg-[var(--ms-soft-bg)] p-2 text-[var(--ms-mauve)]"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { key: "portfolio",    label: "Portfolio"     },
                { key: "before_after", label: "Before/After"  },
                { key: "tip",          label: "Tutorial"      },
                { key: "promotion",    label: "Offer"         },
              ].map((t) => (
                <button key={t.key} type="button" onClick={() => setNewTag(t.key)}
                  className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    newTag === t.key ? "bg-[var(--ms-plum)] text-white" : "bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)]")}>
                  {t.label}
                </button>
              ))}
            </div>
            <ImageUploadEditor label="Add photo" requirements="JPG or PNG · max 5 MB" aspectHint="1:1" maxMB={5} value={newImages[0]} onSave={(url) => setNewImages((p) => [...p, url])} />
            <textarea
              className="mt-3 w-full resize-none rounded-[16px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
              rows={3} placeholder="Describe your work… add #hashtags" value={newCaption} onChange={(e) => setNewCaption(e.target.value)}
            />
            <button type="button" onClick={handlePublishPost} disabled={!newCaption.trim() && newImages.length === 0}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40">
              <Send className="h-4 w-4" /> Post to community
            </button>
          </div>
        </div>
      )}

      {/* Post detail modal */}
      {expandedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(13,27,42,0.28)]">
            <div className="flex items-center gap-3 border-b border-[var(--ms-border)] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-sm font-bold text-white">
                {expandedPost.authorName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--ms-navy)]">{expandedPost.authorName}</p>
                <p className="text-xs text-[var(--ms-mauve)]">{new Date(expandedPost.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <button type="button" onClick={() => setExpandedPost(null)} className="rounded-full bg-[var(--ms-soft-bg)] p-2"><X className="h-4 w-4 text-[var(--ms-mauve)]" /></button>
            </div>
            {expandedPost.images[0] && <img src={expandedPost.images[0]} alt="Post" className="max-h-64 w-full object-cover" />}
            <div className="border-b border-[var(--ms-border)] p-4">
              <p className="text-sm leading-6 text-[var(--ms-charcoal)]">{expandedPost.caption}</p>
              <div className="mt-3 flex items-center gap-4">
                <button type="button" onClick={() => handleLike(expandedPost.id)} className={cn("flex items-center gap-1.5 text-sm font-semibold transition", expandedPost.savedBy.includes(session.id) ? "text-[var(--ms-rose)]" : "text-[var(--ms-mauve)]")}>
                  <Heart className="h-4 w-4" fill={expandedPost.savedBy.includes(session.id) ? "currentColor" : "none"} /> {expandedPost.likes}
                </button>
                <span className="flex items-center gap-1.5 text-sm text-[var(--ms-mauve)]"><MessageCircle className="h-4 w-4" /> {expandedPost.comments.length}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {expandedPost.comments.length === 0 && <p className="text-center text-xs text-[var(--ms-mauve)]">No comments yet.</p>}
              {expandedPost.comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-xs font-bold text-[var(--ms-plum)]">{c.authorName.slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0 rounded-[14px] bg-[var(--ms-soft-bg)] px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--ms-navy)]">{c.authorName}</p>
                    <p className="text-xs leading-5 text-[var(--ms-charcoal)]">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-[var(--ms-border)] p-3">
              <input className="flex-1 rounded-full border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2 text-sm outline-none" placeholder="Add a comment…" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }} />
              <button type="button" onClick={handleComment} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ms-plum)] text-white hover:bg-[var(--ms-orchid)]"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalonProfileWorkspace({
  session,
  onSave,
}: {
  session: SalonUserProfile;
  onSave: (session: AppUserSession) => void;
}) {
  return <ProviderProfileWorkspace session={session} onSave={onSave} />;
}

function ProfessionalProfileWorkspace({
  session,
  onSave,
  onDeleteDraft,
}: {
  session: ProfessionalUserProfile;
  onSave: (session: AppUserSession) => void;
  onDeleteDraft: () => void;
}) {
  return <ProviderProfileWorkspace session={session} onSave={onSave} onDeleteDraft={onDeleteDraft} />;
}

function GuestProfilePrompt() {
  return (
    <section className="mx-auto max-w-2xl rounded-[32px] border border-[var(--ms-rose)]/20 bg-white p-6 text-center shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
      <Sparkles className="mx-auto h-9 w-9 text-[var(--ms-rose)]" />
      <h1 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)]">Create your beauty profile.</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--ms-mauve)]">
        Guest mode is for browsing. Create an account to post, message, save profiles, and shape your beauty world.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <CTAButton href="/signup/client">Create client account</CTAButton>
        <CTAButton href="/home" variant="outline">Keep browsing</CTAButton>
      </div>
    </section>
  );
}

function OperationsProfilePrompt({ role }: { role: "shop" | "delivery" }) {
  const href = role === "shop" ? "/shop/dashboard" : "/delivery/dashboard";
  const label = role === "shop" ? "Shop dashboard" : "Delivery dashboard";

  return (
    <section className="mx-auto max-w-2xl rounded-[32px] border border-[var(--ms-border)] bg-white p-6 text-center shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
      <Store className="mx-auto h-9 w-9 text-[var(--ms-rose)]" />
      <h1 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)]">Your operational workspace is separate.</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--ms-mauve)]">
        Shop and delivery accounts stay focused on products, dispatch, and fulfilment. Social Home is reserved for Client, Pro, and Salon accounts.
      </p>
      <div className="mt-5 flex justify-center">
        <CTAButton href={href}>{label}</CTAButton>
      </div>
    </section>
  );
}

function SuperAdminWorkspace() {
  // Redirect to the full /admin control panel.
  useEffect(() => {
    window.location.href = "/admin";
  }, []);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="loader-bloom h-14 w-14" />
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending:               "bg-amber-100 text-amber-700",
  accepted:              "bg-emerald-100 text-emerald-700",
  completed:             "bg-[var(--ms-petal)] text-[var(--ms-rose)]",
  declined:              "bg-red-100 text-red-600",
  cancelled:             "bg-gray-100 text-gray-500",
  reschedule_requested:  "bg-blue-100 text-blue-600",
  draft:                 "bg-gray-100 text-gray-400",
};

function ProviderRequestsPanel({
  providerSlug,
  roleLabel,
}: {
  providerSlug: string;
  roleLabel: string;
}) {
  const [pending,  setPending]  = useState<BookingRequest[]>([]);
  const [history,  setHistory]  = useState<BookingRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    function sync() {
      const all = getAllProviderBookings(providerSlug);
      setPending(all.filter((b) => b.status === "pending"));
      setHistory(all.filter((b) => b.status !== "pending"));
    }

    sync();
    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [providerSlug]);

  return (
    <SectionReveal className="beauty-card rounded-[32px] p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">{roleLabel} requests</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)]">Booking requests arrive here.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ms-mauve)]">
            When a client chooses you during booking, the request appears here with the service, time, notes, and funded amount.
          </p>
        </div>
        <span className="w-fit rounded-full bg-[var(--ms-soft-bg)] px-4 py-2 text-sm font-semibold text-[var(--ms-plum)]">
          {pending.length} pending
        </span>
      </div>

      {/* ── Pending queue ── */}
      <div className="mt-6 space-y-3">
        {pending.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-6 text-center">
            <Clock className="mx-auto h-8 w-8 text-[var(--ms-mauve)] opacity-50" />
            <p className="mt-3 text-sm font-semibold text-[var(--ms-navy)]">No pending requests</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[var(--ms-mauve)]">
              Stay published and keep your profile updated. New requests will show here instantly.
            </p>
          </div>
        ) : (
          pending.map((request) => (
            <div key={request.id} className="rounded-[24px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_10px_28px_rgba(13,27,42,0.06)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--ms-petal)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ms-rose)]">NEW REQUEST</span>
                    <p className="truncate text-sm font-semibold text-[var(--ms-navy)]">{request.clientName}</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--ms-charcoal)]">{request.services.join(", ")}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--ms-mauve)]">
                    {request.preferredDate} · {request.preferredTime} · KES {request.totalKES.toLocaleString()}
                  </p>
                  {request.location ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--ms-mauve)]">
                      <MapPin className="h-3.5 w-3.5" /> {request.location}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => updateBookingStatus(request.id, "accepted")}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBookingStatus(request.id, "declined")}
                    className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-200"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              </div>
              {request.notes ? (
                <p className="mt-4 rounded-[18px] bg-[var(--ms-soft-bg)] px-4 py-3 text-xs leading-6 text-[var(--ms-mauve)]">
                  {request.notes}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* ── Booking history ── */}
      {history.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm font-semibold text-[var(--ms-plum)] transition hover:border-[var(--ms-rose)]/40"
          >
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[var(--ms-rose)]" />
              Booking history · {history.length} appointment{history.length !== 1 ? "s" : ""}
            </span>
            <svg
              className={cn("h-4 w-4 text-[var(--ms-mauve)] transition-transform", showHistory && "rotate-180")}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.map((b) => {
                const statusClass = STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-500";
                return (
                  <div key={b.id} className="rounded-[20px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_4px_12px_rgba(13,27,42,0.04)]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ms-navy)]">{b.clientName}</p>
                        <p className="mt-0.5 truncate text-xs text-[var(--ms-mauve)]">{b.services.join(", ")}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--ms-charcoal)]">
                          {b.preferredDate} · {b.preferredTime} · KES {b.totalKES.toLocaleString()}
                        </p>
                      </div>
                      <span className={cn("w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase shrink-0", statusClass)}>
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {/* Mark completed action for accepted bookings */}
                    {b.status === "accepted" && (
                      <button
                        type="button"
                        onClick={() => updateBookingStatus(b.id, "completed")}
                        className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--ms-petal)] px-3 py-1.5 text-[10px] font-semibold text-[var(--ms-rose)] hover:bg-[var(--ms-rose)] hover:text-white"
                      >
                        <Check className="h-3 w-3" /> Mark completed
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </SectionReveal>
  );
}

function ProviderMessagesPanel({
  avatar,
  displayName,
  messagingId,
  roleLabel,
}: {
  avatar?: string;
  displayName: string;
  messagingId: string;
  roleLabel: string;
}) {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);
  const [dmText, setDmText] = useState("");

  useEffect(() => {
    function sync() {
      const nextThreads = readThreads().filter((thread) => thread.participantIds.includes(messagingId));
      setThreads(nextThreads);
      setActiveThread((current) => {
        if (!current) return null;
        return nextThreads.find((thread) => thread.id === current.id) ?? null;
      });
    }

    sync();
    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [messagingId]);

  function sendReply() {
    if (!activeThread || !dmText.trim()) return;
    sendMessage(activeThread.id, {
      id: `msg_${Date.now()}`,
      text: dmText.trim(),
      senderId: messagingId,
      senderName: displayName,
      senderAvatar: avatar,
      createdAt: new Date().toISOString(),
      read: false,
    });
    setDmText("");
  }

  const sortedThreads = [...threads].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return (
    <SectionReveal className="beauty-card rounded-[32px] p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">{roleLabel} inbox</p>
      <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)]">Client messages stay inside Mobile Salon.</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">
        Conversations started from your public profile appear here so clients do not need to leave the platform.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(220px,0.38fr)_minmax(0,0.62fr)]">
        <div className="space-y-2">
          {sortedThreads.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-5">
              <p className="text-[13px] font-semibold text-[var(--ms-navy)]">No messages yet</p>
              <p className="mt-1.5 text-[12px] leading-5 text-[var(--ms-mauve)]">
                When a client visits your public profile and taps <strong>Message</strong>, their conversation
                appears here. Share your posts to get discovered — messages follow bookings.
              </p>
            </div>
          ) : (
            sortedThreads.map((thread) => {
              const otherIdx = thread.participantIds.findIndex((id) => id !== messagingId);
              const otherName = thread.participantNames[otherIdx] ?? "Client";
              const lastMsg = thread.messages.at(-1);
              const unread = thread.messages.filter((msg) => !msg.read && msg.senderId !== messagingId).length;

              return (
                <button
                  className={cn(
                    "w-full rounded-[20px] border p-4 text-left transition",
                    activeThread?.id === thread.id
                      ? "border-[var(--ms-rose)] bg-[var(--ms-petal)]"
                      : "border-[var(--ms-border)] bg-white hover:border-[var(--ms-rose)]/40",
                  )}
                  key={thread.id}
                  onClick={() => {
                    markThreadRead(thread.id, messagingId);
                    setActiveThread(thread);
                  }}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-[var(--ms-navy)]">{otherName}</p>
                    {unread > 0 && (
                      <span className="rounded-full bg-[var(--ms-rose)] px-2 py-0.5 text-[10px] font-bold text-white">{unread}</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--ms-mauve)]">{lastMsg?.text ?? "No messages yet"}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="min-h-[320px] rounded-[24px] border border-[var(--ms-border)] bg-white">
          {activeThread ? (
            <div className="flex h-full min-h-[320px] flex-col">
              <div className="border-b border-[var(--ms-border)] p-4">
                <p className="text-sm font-semibold text-[var(--ms-navy)]">
                  {activeThread.participantNames.find((name, index) => activeThread.participantIds[index] !== messagingId) ?? "Client"}
                </p>
                <p className="text-xs text-[var(--ms-mauve)]">Protected platform chat</p>
              </div>
              <div className="flex max-h-[360px] flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
                {[...activeThread.messages].reverse().map((msg) => {
                  const isMe = msg.senderId === messagingId;
                  return (
                    <div className={cn("flex", isMe ? "justify-end" : "justify-start")} key={msg.id}>
                      <div
                        className={cn(
                          "max-w-[78%] rounded-[18px] px-4 py-2.5 text-sm leading-6",
                          isMe
                            ? "bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-white"
                            : "bg-[var(--ms-soft-bg)] text-[var(--ms-charcoal)]",
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-end gap-2 border-t border-[var(--ms-border)] p-3">
                <textarea
                  className="flex-1 resize-none rounded-[16px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2.5 text-sm leading-6 outline-none focus:border-[var(--ms-rose)]"
                  onChange={(event) => setDmText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder="Reply without leaving the platform..."
                  rows={1}
                  value={dmText}
                />
                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ms-rose)] text-white"
                  onClick={sendReply}
                  type="button"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[320px] place-items-center p-6 text-center">
              <div>
                <MessageCircle className="mx-auto h-10 w-10 text-[var(--ms-mauve)] opacity-40" />
                <p className="mt-3 text-sm font-semibold text-[var(--ms-navy)]">Select a conversation</p>
                <p className="mt-1 text-xs leading-6 text-[var(--ms-mauve)]">New client messages will appear in the inbox list.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionReveal>
  );
}

function ProfileAvatar({ photo, label }: { photo?: string; label: string }) {
  if (photo) {
    return (
      <div
        aria-label={label}
        className="h-16 w-16 rounded-full border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${photo})` }}
      >
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-lg font-semibold text-[var(--ms-plum)]">
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
}) {
  return (
    <label className="block rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-4">
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">
        {icon}
        {label}
      </span>
      <input
        className="mt-3 w-full bg-transparent text-sm font-semibold text-[var(--ms-navy)] outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-4">
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">{label}</span>
      <textarea
        className="mt-3 min-h-28 w-full resize-none bg-transparent text-sm leading-6 text-[var(--ms-charcoal)] outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function SummaryRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[var(--ms-soft-bg)] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-[var(--ms-rose)]">{icon}</span>
        <p className="text-sm text-[var(--ms-mauve)]">{label}</p>
      </div>
      <p className="text-sm font-semibold text-[var(--ms-navy)]">{value}</p>
    </div>
  );
}

function CardPreferenceRow({
  card,
  onToggle,
  onRemove,
}: {
  card: ProfileCardPreference;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--ms-border)] bg-white px-4 py-4 shadow-[0_12px_24px_rgba(13,27,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--ms-navy)]">{card.label}</p>
          <p className="mt-1 text-xs text-[var(--ms-mauve)]">
            {card.enabled ? "Visible on page" : "Hidden from page"}
          </p>
        </div>
        <button
          className={`flex h-7 w-12 items-center rounded-full p-1 transition ${card.enabled ? "justify-end bg-[var(--ms-magenta)]" : "justify-start bg-[var(--ms-border)]"}`}
          onClick={onToggle}
          type="button"
        >
          <span className="h-5 w-5 rounded-full bg-white" />
        </button>
      </div>
      {onRemove ? (
        <button
          className="mt-4 text-sm font-semibold text-[var(--ms-rose)]"
          onClick={onRemove}
          type="button"
        >
          Remove card
        </button>
      ) : null}
    </div>
  );
}
