"use client";

import Link from "next/link";
import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Gem,
  Heart,
  LayoutGrid,
  Layers,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  Repeat2,
  Scissors,
  Send,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { ImageUploadEditor } from "@/components/image-upload-editor";
import {
  APP_SESSION_EVENT,
  readAppSession,
  type AppUserSession,
} from "@/lib/client-session";
import {
  readPosts,
  writePost,
  likePost,
  repostPost,
  bookmarkPost,
  sharePost,
  addComment,
  deletePost,
  archivePost,
  readFollowedAuthors,
  toggleFollowAuthor,
  readSaves,
  SOCIAL_CHANGE_EVENT,
  type SocialPost,
  type SocialSaves,
  type SocialComment,
} from "@/lib/social-store";
import { cn } from "@/lib/utils";
import {
  readStories,
  addStory,
  getStoriesByAuthor,
  STORY_CHANGE_EVENT,
  type Story,
} from "@/lib/story-store";
import { GreetingBanner, DailyCheckIn } from "@/components/wow-ux";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedTab = "foryou" | "following";
type CategoryKey = "all" | "portfolio" | "before_after" | "tip" | "inspo" | "promotion";
type PostVariant = "hero" | "compact";

// ─── Rooms ────────────────────────────────────────────────────────────────────

type RoomId =
  | "r_all"
  | "r_looks"
  | "r_glow"
  | "r_nails"
  | "r_tutorials"
  | "r_transform"
  | "r_inspo"
  | "r_offers";

interface Room {
  id: RoomId;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ElementType<any>;
  filter: CategoryKey;
}

const ROOMS: Room[] = [
  { id: "r_all",       label: "All",         icon: LayoutGrid, filter: "all"          },
  { id: "r_looks",     label: "Looks",       icon: Scissors,   filter: "portfolio"    },
  { id: "r_glow",      label: "Glow",        icon: Droplets,   filter: "portfolio"    },
  { id: "r_nails",     label: "Nails",       icon: Gem,        filter: "portfolio"    },
  { id: "r_tutorials", label: "Tutorials",   icon: Play,       filter: "tip"          },
  { id: "r_transform", label: "Before·After",icon: Layers,     filter: "before_after" },
  { id: "r_inspo",     label: "Inspo",       icon: Sparkles,   filter: "inspo"        },
  { id: "r_offers",    label: "Offers",      icon: Tag,        filter: "promotion"    },
];

const TRENDING_TAGS = [
  { tag: "#boxbraids",     posts: "2.4K posts"  },
  { tag: "#naturalhair",   posts: "18K posts"   },
  { tag: "#nairobiglow",   posts: "891 posts"   },
  { tag: "#locjourney",    posts: "1.2K posts"  },
  { tag: "#bridalnairobi", posts: "547 posts"   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function roleLabel(role: SocialPost["authorRole"]): string {
  return role === "professional" ? "Pro" : role === "salon" ? "Salon" : "Client";
}

function roleColors(role: SocialPost["authorRole"]): string {
  if (role === "professional") return "bg-[#F0EBFF] text-[#8B5CF6]";
  if (role === "salon")        return "bg-[#FEF0F3] text-[#C8284A]";
  return "bg-[#E8F5F2] text-[#1A7A6B]";
}

function avatarGradient(role: SocialPost["authorRole"]): string {
  if (role === "professional") return "from-purple-500 to-purple-700";
  if (role === "salon")        return "from-rose-500 to-red-700";
  return "from-teal-400 to-teal-600";
}

/** Safely extract profilePhoto from any session role (guests have none) */
function getSessionPhoto(session: AppUserSession | null): string | undefined {
  if (!session || session.role === "guest") return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session as any).profilePhoto as string | undefined;
}

/** Safely extract display name from any session role */
function getSessionName(session: AppUserSession | null): string {
  if (!session) return "Guest";
  if (session.role === "client")       return (session as { firstName: string }).firstName;
  if (session.role === "professional") return (session as { displayName: string }).displayName;
  if (session.role === "salon")        return (session as { salonName: string }).salonName;
  return "Guest";
}

/** Safely extract publicSlug for provider sessions (undefined for clients/guests) */
function getSessionSlug(session: AppUserSession | null): string | undefined {
  if (!session) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session as any).publicSlug as string | undefined;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  src,
  name,
  role,
  size = 40,
  ring = false,
}: {
  src?: string;
  name: string;
  role: SocialPost["authorRole"];
  size?: number;
  ring?: boolean;
}) {
  const gradient = avatarGradient(role);
  const inner = (
    <div
      className={`shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src
        ? <img src={src} alt={name} className="h-full w-full object-cover" />
        : name[0]?.toUpperCase()}
    </div>
  );

  if (!ring) return inner;

  return (
    <div
      style={{
        padding: 2.5,
        background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#D4537E,#8B5CF6) border-box",
        border: "2.5px solid transparent",
        borderRadius: "50%",
        width: size + 5,
        height: size + 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {inner}
    </div>
  );
}

// ─── Rooms bar ────────────────────────────────────────────────────────────────

function RoomsBar({
  activeRoomId,
  onSelect,
}: {
  activeRoomId: RoomId;
  onSelect: (room: Room) => void;
}) {
  return (
    <div className="mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
      <div className="flex items-stretch gap-2 px-4">
        {ROOMS.map((room) => {
          const active = activeRoomId === room.id;
          const Icon = room.icon;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room)}
              className={cn(
                "flex shrink-0 flex-col items-center justify-center gap-[5px] rounded-[14px] border px-3 py-2.5 transition-all duration-200",
                active
                  ? "border-[#0D1B2A] bg-[#0D1B2A] text-white shadow-[0_4px_14px_rgba(13,27,42,0.22)]"
                  : "border-[var(--ms-border)] bg-white text-[#7A7580] hover:border-[#0D1B2A]/25 hover:text-[#0D1B2A]",
              )}
              style={{ minWidth: 64 }}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              <span className="text-[9.5px] font-bold leading-none tracking-[0.03em]">{room.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stories row ─────────────────────────────────────────────────────────────

function StoriesRow({
  sessionId,
  sessionName,
  sessionPhoto,
  sessionRole,
  allStories,
  onAddStory,
  onViewStory,
}: {
  sessionId: string;
  sessionName: string;
  sessionPhoto?: string;
  sessionRole: AppUserSession["role"];
  allStories: Story[];
  onAddStory: () => void;
  onViewStory: (authorId: string) => void;
}) {
  const avatarRole: SocialPost["authorRole"] =
    sessionRole === "professional" ? "professional" :
    sessionRole === "salon"        ? "salon"        : "client";

  const myStories = allStories.filter((s) => s.authorId === sessionId);
  const iHaveStory = myStories.length > 0;

  // Unique authors with stories (excluding self)
  const otherCreators = Array.from(
    allStories
      .filter((s) => s.authorId !== sessionId)
      .reduce((map, s) => {
        if (!map.has(s.authorId)) {
          map.set(s.authorId, {
            id: s.authorId,
            name: s.authorName,
            avatar: s.authorAvatar,
            role: s.authorRole,
          });
        }
        return map;
      }, new Map<string, { id: string; name: string; avatar?: string; role: Story["authorRole"] }>()),
  ).map(([, c]) => c);

  return (
    <div className="mb-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
      <div className="flex items-start gap-4 px-4 pb-1">
        {/* Your story */}
        <button
          type="button"
          onClick={iHaveStory ? () => onViewStory(sessionId) : onAddStory}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="relative">
            {/* Ring: gradient if you have a story, plain border otherwise */}
            <div
              className={`p-[2.5px] rounded-full ${iHaveStory ? "" : "p-0"}`}
              style={iHaveStory ? { background: "linear-gradient(135deg,#D4537E 0%,#8B5CF6 50%,#EC4899 100%)" } : {}}
            >
              <div className={`${iHaveStory ? "rounded-full overflow-hidden bg-white p-[1.5px]" : ""}`}>
                <div
                  className={`h-[58px] w-[58px] overflow-hidden rounded-full border-2 ${iHaveStory ? "border-transparent" : "border-[var(--ms-border)]"}`}
                  style={iHaveStory ? {} : { background: "linear-gradient(135deg,#f3e8ff,#fce7f3)" }}
                >
                  {sessionPhoto ? (
                    <img src={sessionPhoto} alt={sessionName} className="h-full w-full object-cover" />
                  ) : (
                    <div className={`h-full w-full flex items-center justify-center bg-gradient-to-br ${avatarGradient(avatarRole)} font-bold text-white text-lg`}>
                      {sessionName[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* + badge if no story yet */}
            {!iHaveStory && (
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ms-rose)] text-white border-2 border-white shadow-sm">
                <Plus className="h-3 w-3" strokeWidth={3} />
              </div>
            )}
          </div>
          <span className="text-[9.5px] font-semibold leading-tight text-[var(--ms-navy)] max-w-[58px] truncate text-center">
            Your story
          </span>
        </button>

        {/* Other users with active stories */}
        {otherCreators.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onViewStory(c.id)}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div
              className="p-[2.5px] rounded-full"
              style={{ background: "linear-gradient(135deg,#D4537E 0%,#8B5CF6 50%,#EC4899 100%)" }}
            >
              <div className="rounded-full overflow-hidden bg-white p-[1.5px]">
                <div
                  className={`h-[54px] w-[54px] overflow-hidden rounded-full flex items-center justify-center bg-gradient-to-br ${avatarGradient(c.role === "team_member" ? "client" : c.role)} font-bold text-white text-base`}
                >
                  {c.avatar ? (
                    <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    c.name[0]?.toUpperCase()
                  )}
                </div>
              </div>
            </div>
            <span className="text-[9.5px] font-semibold leading-tight text-[var(--ms-navy)] max-w-[58px] truncate text-center">
              {c.name.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Story create modal ───────────────────────────────────────────────────────

function StoryCreateModal({
  session,
  onClose,
  onPosted,
}: {
  session: AppUserSession;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [step, setStep] = useState<"choose" | "preview">("choose");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);

  const galleryInputRef = { current: null as HTMLInputElement | null };
  const cameraInputRef  = { current: null as HTMLInputElement | null };

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMediaUrl(ev.target?.result as string);
      setStep("preview");
    };
    reader.readAsDataURL(file);
  }

  function handlePost() {
    if (!mediaUrl) return;
    setPosting(true);
    const authorRole =
      session.role === "salon"        ? "salon"        :
      session.role === "professional" ? "professional" :
      session.role === "team_member"  ? "team_member"  : "client";

    addStory({
      authorId:     session.id,
      authorName:   getSessionName(session),
      authorRole,
      authorAvatar: getSessionPhoto(session),
      mediaUrl,
      mediaType,
      caption:      caption.trim() || undefined,
    });
    setTimeout(() => {
      setPosting(false);
      onPosted();
    }, 400);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-[32px] bg-white sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--ms-border)]" />

        {step === "choose" ? (
          <div className="p-6">
            <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">Add to your story</h2>
            <p className="mt-1 text-[13px] text-[var(--ms-mauve)]">
              Stories disappear after 24 hours.
            </p>

            <div className="mt-5 space-y-3">
              {/* Choose from storage */}
              <label className="flex cursor-pointer items-center gap-4 rounded-[20px] bg-[var(--ms-soft-bg)] px-5 py-4 transition hover:bg-[#F0EBFF]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F0EBFF]">
                  <LayoutGrid className="h-5 w-5 text-[var(--ms-plum)]" strokeWidth={1.85} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-[var(--ms-navy)]">Choose from gallery</p>
                  <p className="text-[12px] text-[var(--ms-mauve)]">Photo or video from your device</p>
                </div>
                <input
                  ref={(el) => { galleryInputRef.current = el; }}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>

              {/* Take a photo/video */}
              <label className="flex cursor-pointer items-center gap-4 rounded-[20px] bg-[var(--ms-soft-bg)] px-5 py-4 transition hover:bg-[#FEF0F3]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FEF0F3]">
                  <Camera className="h-5 w-5 text-[var(--ms-rose)]" strokeWidth={1.85} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-[var(--ms-navy)]">Take a photo or video</p>
                  <p className="text-[12px] text-[var(--ms-mauve)]">Open your camera now</p>
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)] transition hover:bg-[var(--ms-soft-bg)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          /* ── Preview step ── */
          <div className="p-0">
            {/* Media preview */}
            <div className="relative aspect-[9/14] w-full overflow-hidden bg-black sm:aspect-[9/12]">
              {mediaType === "image" && mediaUrl ? (
                <img src={mediaUrl} alt="Story preview" className="h-full w-full object-cover" />
              ) : mediaUrl ? (
                <video src={mediaUrl} className="h-full w-full object-cover" autoPlay muted playsInline loop />
              ) : null}

              {/* Caption overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption…"
                  className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/50"
                />
              </div>

              {/* Back button */}
              <button
                type="button"
                onClick={() => { setStep("choose"); setMediaUrl(null); }}
                className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Post button */}
            <div className="p-4">
              <button
                type="button"
                onClick={handlePost}
                disabled={posting}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(212,83,126,0.3)] transition hover:brightness-110 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))" }}
              >
                {posting ? "Posting…" : "Add to story"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Story viewer modal ───────────────────────────────────────────────────────

function StoryViewerModal({
  authorId,
  allStories,
  onClose,
}: {
  authorId: string;
  allStories: Story[];
  onClose: () => void;
}) {
  const stories = getStoriesByAuthor(authorId).length > 0
    ? getStoriesByAuthor(authorId)
    : allStories.filter((s) => s.authorId === authorId);

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const DURATION = 5000; // 5s per story

  const current = stories[index];

  useEffect(() => {
    if (!current || current.mediaType === "video") return;
    const timer = setTimeout(() => {
      setProgress(0);
    }, 0);
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= DURATION) {
        clearInterval(tick);
        if (index < stories.length - 1) {
          setIndex((i) => i + 1);
        } else {
          onClose();
        }
      }
    }, 50);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [index, current, stories.length, onClose]);

  if (!current) return null;

  const timeAgo = (() => {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(current.createdAt).getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
    return `${h}h ago`;
  })();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3">
          {stories.map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-none"
                style={{
                  width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Author + close */}
        <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-white/20">
              {current.authorAvatar ? (
                <img src={current.authorAvatar} alt={current.authorName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[13px] font-bold text-white">
                  {current.authorName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-[13px] font-bold text-white drop-shadow">{current.authorName.split(" ")[0]}</p>
              <p className="text-[10px] text-white/70">{timeAgo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Media */}
        {current.mediaType === "image" ? (
          <img
            src={current.mediaUrl}
            alt={current.caption ?? "Story"}
            className="h-full w-full object-cover"
          />
        ) : (
          <video
            src={current.mediaUrl}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            loop={false}
            onEnded={() => {
              if (index < stories.length - 1) setIndex((i) => i + 1);
              else onClose();
            }}
          />
        )}

        {/* Caption */}
        {current.caption && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-5 py-8">
            <p className="text-sm font-semibold text-white drop-shadow-md">{current.caption}</p>
          </div>
        )}

        {/* Tap zones: left = previous, right = next */}
        <div className="absolute inset-0 z-10 flex">
          <button
            type="button"
            className="flex-1 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); if (index > 0) setIndex((i) => i - 1); else onClose(); }}
            aria-label="Previous story"
          />
          <button
            type="button"
            className="flex-1 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); if (index < stories.length - 1) setIndex((i) => i + 1); else onClose(); }}
            aria-label="Next story"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Post options menu ────────────────────────────────────────────────────────

function PostMenu({
  isOwner,
  isFollowing,
  isArchived,
  onFollow,
  onArchive,
  onDelete,
  onClose,
}: {
  isOwner: boolean;
  isFollowing: boolean;
  isArchived?: boolean;
  onFollow: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--ms-border)]" />
        <div className="p-4">
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={onArchive}
                className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-semibold text-[var(--ms-navy)] hover:bg-[var(--ms-soft-bg)]"
              >
                <Archive className="h-5 w-5 text-[var(--ms-mauve)]" />
                {isArchived ? "Unarchive post" : "Archive post"}
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-5 w-5" />
                Delete post
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onFollow}
                className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-semibold text-[var(--ms-navy)] hover:bg-[var(--ms-soft-bg)]"
              >
                {isFollowing
                  ? <><UserCheck className="h-5 w-5 text-[var(--ms-plum)]" /> Unfollow</>
                  : <><UserPlus className="h-5 w-5 text-[var(--ms-mauve)]" /> Follow</>}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-semibold text-[var(--ms-mauve)] hover:bg-[var(--ms-soft-bg)]"
              >
                Not interested
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50"
              >
                Report
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-1 flex w-full items-center justify-center rounded-[14px] px-4 py-3 text-sm font-semibold text-[var(--ms-mauve)] hover:bg-[var(--ms-soft-bg)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[var(--ms-navy)]">Delete this post?</h3>
        <p className="mt-1 text-sm text-[var(--ms-mauve)]">
          This cannot be undone. The post will be removed from everyone&apos;s feed.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-sm font-semibold text-[var(--ms-navy)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-red-600 py-3 text-sm font-bold text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  sessionId,
  sessionRole,
  sessionPhoto,
  sessionName,
  onToast,
  followedAuthors,
  onFollowToggle,
  onDeleted,
  onArchived,
  variant = "hero",
  className,
}: {
  post: SocialPost;
  sessionId: string;
  sessionRole: AppUserSession["role"];
  sessionPhoto: string | undefined;
  sessionName: string;
  onToast: (msg: string) => void;
  followedAuthors: Set<string>;
  onFollowToggle: (authorId: string) => void;
  onDeleted: (postId: string) => void;
  onArchived: (postId: string) => void;
  variant?: PostVariant;
  className?: string;
}) {
  const isGuest   = sessionRole === "guest";
  const isOwner   = post.authorId === sessionId;
  const isFollowing = followedAuthors.has(post.authorId);

  const [localPost,        setLocalPost]        = useState(post);
  const [imgIdx,           setImgIdx]           = useState(0);
  const [commentsOpen,     setCommentsOpen]     = useState(false);
  const [commentText,      setCommentText]      = useState("");
  const [captionExpanded,  setCaptionExpanded]  = useState(false);
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [confirmDelete,    setConfirmDelete]    = useState(false);

  const liked      = localPost.savedBy.includes(sessionId);
  const bookmarked = (localPost.bookmarkedBy ?? []).includes(sessionId);
  const reposted   = (localPost.repostedBy ?? []).includes(sessionId);

  function guard(action: () => void) {
    if (isGuest) { onToast("Join free to interact"); return; }
    action();
  }

  function handleLike() {
    guard(() => {
      likePost(localPost.id, sessionId);
      setLocalPost((p) => ({
        ...p,
        likes: liked ? p.likes - 1 : p.likes + 1,
        savedBy: liked
          ? p.savedBy.filter((id) => id !== sessionId)
          : [...p.savedBy, sessionId],
      }));
    });
  }

  function handleRepost() {
    guard(() => {
      repostPost(localPost.id, sessionId);
      setLocalPost((p) => ({
        ...p,
        repostedBy: reposted
          ? (p.repostedBy ?? []).filter((id) => id !== sessionId)
          : [...(p.repostedBy ?? []), sessionId],
      }));
      onToast(reposted ? "Repost removed" : "Reposted to your followers");
    });
  }

  function handleBookmark() {
    guard(() => {
      bookmarkPost(localPost.id, sessionId);
      setLocalPost((p) => ({
        ...p,
        bookmarkedBy: bookmarked
          ? (p.bookmarkedBy ?? []).filter((id) => id !== sessionId)
          : [...(p.bookmarkedBy ?? []), sessionId],
      }));
      onToast(bookmarked ? "Removed from saved" : "Saved to your collection");
    });
  }

  function handleShare() {
    sharePost(localPost.id);
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: localPost.authorName, text: localPost.caption }).catch(() => null);
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => null);
      onToast("Link copied");
    }
  }

  function handleComment() {
    guard(() => {
      if (!commentText.trim()) return;
      const comment: SocialComment = {
        id: `cmt_${Date.now()}`,
        authorId: sessionId,
        authorName: sessionName,
        authorAvatar: sessionPhoto,
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
      };
      addComment(localPost.id, comment);
      setLocalPost((p) => ({ ...p, comments: [...p.comments, comment] }));
      setCommentText("");
    });
  }

  function handleFollow() {
    guard(() => {
      onFollowToggle(localPost.authorId);
      onToast(isFollowing
        ? `Unfollowed ${localPost.authorName}`
        : `Following ${localPost.authorName}`);
      setMenuOpen(false);
    });
  }

  function handleArchive() {
    archivePost(localPost.id, sessionId);
    onArchived(localPost.id);
    setMenuOpen(false);
    onToast(localPost.archived ? "Post restored to feed" : "Post archived — only you can see it");
  }

  function handleDelete() {
    deletePost(localPost.id, sessionId);
    onDeleted(localPost.id);
    setMenuOpen(false);
    setConfirmDelete(false);
  }

  // ── Compact variant — pure image card with overlay ──────────────────────────
  if (variant === "compact") {
    return (
      <>
        <article
          className={cn(
            "relative overflow-hidden rounded-[16px] bg-[var(--ms-soft-bg)] shadow-[0_1px_6px_rgba(13,27,42,0.07)]",
            className,
          )}
          style={{ aspectRatio: "1 / 1" }}
        >
          {localPost.images.length > 0 ? (
            <img
              src={localPost.images[0]}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-3">
              <p className="line-clamp-5 text-center text-[11px] leading-4 text-[var(--ms-mauve)]">
                {localPost.caption}
              </p>
            </div>
          )}

          {/* Dual-edge gradient — top for author legibility, bottom for actions */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(13,27,42,0.45)_0%,transparent_38%,transparent_54%,rgba(13,27,42,0.52)_100%)]" />

          {/* Top row: avatar + name + menu */}
          <div className="absolute left-2 right-2 top-2 flex items-center gap-1.5">
            <Avatar
              src={localPost.authorAvatar}
              name={localPost.authorName}
              role={localPost.authorRole}
              size={22}
            />
            <span className="min-w-0 flex-1 truncate text-[10px] font-bold leading-none text-white drop-shadow-sm">
              {localPost.authorName}
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="shrink-0 rounded-full p-0.5"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-white/90" />
            </button>
          </div>

          {/* Before·After badge */}
          {localPost.type === "before_after" && (
            <span className="absolute left-2 top-8 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
              B·A
            </span>
          )}
          {localPost.type === "tip" && (
            <span className="absolute left-2 top-8 flex items-center gap-0.5 rounded-full bg-[var(--ms-plum)]/80 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
              <Play className="h-2.5 w-2.5 fill-white" /> Tutorial
            </span>
          )}

          {/* Bottom row: like + comment + bookmark */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
            <button type="button" onClick={handleLike} className="flex items-center gap-1">
              <Heart
                className={cn(
                  "h-[15px] w-[15px] transition-all",
                  liked ? "fill-white text-white scale-110" : "text-white/80",
                )}
              />
              <span className="text-[10px] font-semibold leading-none text-white">
                {fmtCount(localPost.likes)}
              </span>
            </button>
            <div className="flex items-center gap-1 text-white/70">
              <MessageCircle className="h-[14px] w-[14px]" />
              <span className="text-[10px] leading-none">{fmtCount(localPost.comments.length)}</span>
            </div>
            <span className="flex-1" />
            <button type="button" onClick={handleBookmark}>
              <Bookmark
                className={cn(
                  "h-[15px] w-[15px] transition-all",
                  bookmarked ? "fill-white text-white" : "text-white/70",
                )}
              />
            </button>
          </div>
        </article>

        {menuOpen && (
          <PostMenu
            isOwner={isOwner}
            isFollowing={isFollowing}
            isArchived={localPost.archived}
            onFollow={handleFollow}
            onArchive={handleArchive}
            onDelete={() => { setMenuOpen(false); setConfirmDelete(true); }}
            onClose={() => setMenuOpen(false)}
          />
        )}
        {confirmDelete && (
          <DeleteConfirm onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
        )}
      </>
    );
  }

  // ── Hero variant — full editorial card ──────────────────────────────────────
  const caption   = localPost.caption;
  const SHORT     = 130;
  const captionShort = caption.length > SHORT && !captionExpanded ? caption.slice(0, SHORT) : caption;

  return (
    <>
      <article className={cn(
        "overflow-hidden bg-white",
        className,
      )}>
        {/* Author row */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Avatar
            src={localPost.authorAvatar}
            name={localPost.authorName}
            role={localPost.authorRole}
            size={40}
            ring
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold text-[var(--ms-navy)]">{localPost.authorName}</span>
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]",
                roleColors(localPost.authorRole),
              )}>
                {roleLabel(localPost.authorRole)}
              </span>
              {localPost.verified && (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#1A7A6B]" />
              )}
              {localPost.archived && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  Archived
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--ms-mauve)]">
              {localPost.location ? `${localPost.location} · ` : ""}
              {timeAgo(localPost.createdAt)}
            </p>
          </div>

          {/* Follow pill */}
          {!isOwner && (
            <button
              type="button"
              onClick={handleFollow}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition",
                isFollowing
                  ? "border-[var(--ms-plum)] bg-[var(--ms-petal)] text-[var(--ms-plum)]"
                  : "border-[var(--ms-border)] text-[var(--ms-mauve)] hover:border-[var(--ms-plum)] hover:text-[var(--ms-plum)]",
              )}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="shrink-0 rounded-full p-1 text-[var(--ms-mauve)] hover:bg-[var(--ms-soft-bg)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Media — portrait in hero (4:5 Instagram standard) */}
        {localPost.images.length > 0 && (
          <div className="relative aspect-[4/5] overflow-hidden bg-[var(--ms-soft-bg)]">
            <img
              src={localPost.images[imgIdx]}
              alt={localPost.caption}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {/* Type badges */}
            {localPost.type === "before_after" && (
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                Before / After
              </span>
            )}
            {localPost.type === "tip" && (
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[var(--ms-plum)]/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                <Sparkles className="h-3 w-3" /> Tutorial
              </span>
            )}
            {/* Carousel controls */}
            {localPost.images.length > 1 && (
              <>
                {imgIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => setImgIdx((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                {imgIdx < localPost.images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setImgIdx((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {localPost.images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImgIdx(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === imgIdx ? "w-5 bg-white" : "w-1.5 bg-white/50",
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center px-3 pt-3">
          <button
            type="button"
            onClick={handleLike}
            className="flex items-center gap-1.5 rounded-full p-2 transition hover:bg-[var(--ms-soft-bg)]"
          >
            <Heart className={cn(
              "h-[22px] w-[22px] transition-all",
              liked ? "fill-[#B91C1C] text-[#B91C1C] scale-110" : "text-[var(--ms-navy)]",
            )} />
            <span className={cn(
              "text-[13px] font-semibold",
              liked ? "text-[#B91C1C]" : "text-[var(--ms-navy)]",
            )}>
              {fmtCount(localPost.likes)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-full p-2 transition hover:bg-[var(--ms-soft-bg)]"
          >
            <MessageCircle className="h-[22px] w-[22px] text-[var(--ms-navy)]" />
            {localPost.comments.length > 0 && (
              <span className="text-[13px] font-semibold text-[var(--ms-navy)]">
                {fmtCount(localPost.comments.length)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleRepost}
            className="flex items-center gap-1.5 rounded-full p-2 transition hover:bg-[var(--ms-soft-bg)]"
          >
            <Repeat2 className={cn(
              "h-[22px] w-[22px] transition-all",
              reposted ? "text-emerald-500" : "text-[var(--ms-navy)]",
            )} />
            {(localPost.repostedBy?.length ?? 0) > 0 && (
              <span className={cn(
                "text-[13px] font-semibold",
                reposted ? "text-emerald-500" : "text-[var(--ms-navy)]",
              )}>
                {fmtCount(localPost.repostedBy!.length)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-full p-2 transition hover:bg-[var(--ms-soft-bg)]"
          >
            <Send className="h-[22px] w-[22px] text-[var(--ms-navy)]" />
          </button>

          <span className="flex-1" />

          <button
            type="button"
            onClick={handleBookmark}
            className="flex items-center gap-1.5 rounded-full p-2 transition hover:bg-[var(--ms-soft-bg)]"
          >
            <Bookmark className={cn(
              "h-[22px] w-[22px] transition-all",
              bookmarked ? "fill-[var(--ms-plum)] text-[var(--ms-plum)]" : "text-[var(--ms-navy)]",
            )} />
          </button>
        </div>

        {/* Book this provider — connects social feed → booking flow */}
        {localPost.authorSlug && (localPost.authorRole === "professional" || localPost.authorRole === "salon") && (
          <div className="mx-4 mb-2 mt-1">
            <Link
              href={`/book?targetType=${localPost.authorRole === "professional" ? "professionals" : "salons"}&targetId=${localPost.authorSlug}`}
              className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-bold text-white transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))" }}
            >
              <CalendarDays className="h-4 w-4" />
              Book {localPost.authorName.split(" ")[0]}
            </Link>
          </div>
        )}

        {/* Caption */}
        <div className="px-4 pb-2 pt-1">
          <p className="text-[13px] leading-5 text-[var(--ms-charcoal)]">
            <span className="font-bold text-[var(--ms-navy)]">{localPost.authorName}</span>{" "}
            {captionShort}
            {caption.length > SHORT && !captionExpanded && (
              <button
                type="button"
                onClick={() => setCaptionExpanded(true)}
                className="ml-1 font-semibold text-[var(--ms-mauve)]"
              >
                more
              </button>
            )}
          </p>
          {localPost.tags.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {localPost.tags.map((tag) => (
                <span key={tag} className="text-[12px] font-medium text-[#8B5CF6]">{tag}</span>
              ))}
            </p>
          )}
        </div>

        {/* Comments */}
        {localPost.comments.length > 0 && (
          <div className="px-4 pb-2">
            {!commentsOpen ? (
              <button
                type="button"
                onClick={() => setCommentsOpen(true)}
                className="text-[12px] font-semibold text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]"
              >
                View all {localPost.comments.length} comment{localPost.comments.length !== 1 ? "s" : ""}
              </button>
            ) : (
              <div className="space-y-2">
                {localPost.comments.map((c) => (
                  <p key={c.id} className="text-[12px] leading-5 text-[var(--ms-charcoal)]">
                    <span className="font-bold text-[var(--ms-navy)]">{c.authorName}</span>{" "}{c.text}
                  </p>
                ))}
                <button
                  type="button"
                  onClick={() => setCommentsOpen(false)}
                  className="text-[11px] font-semibold text-[var(--ms-mauve)]"
                >
                  Collapse
                </button>
              </div>
            )}
          </div>
        )}

        {/* Comment input */}
        <div className="flex items-center gap-2 border-t border-[var(--ms-border)]/60 px-3 py-2.5">
          {sessionRole !== "guest" ? (
            <Avatar
              src={sessionPhoto}
              name={sessionName}
              role={sessionRole === "client" ? "client" : sessionRole === "professional" ? "professional" : "salon"}
              size={28}
            />
          ) : (
            <div className="h-7 w-7 shrink-0 rounded-full bg-[var(--ms-soft-bg)]" />
          )}
          <input
            type="text"
            placeholder="Add a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
            onClick={() => isGuest && onToast("Join free to comment")}
            readOnly={isGuest}
            className="flex-1 bg-transparent text-[13px] text-[var(--ms-charcoal)] placeholder:text-[var(--ms-border)] outline-none"
          />
          {commentText.trim() && (
            <button
              type="button"
              onClick={handleComment}
              className="text-[13px] font-bold text-[var(--ms-rose)]"
            >
              Post
            </button>
          )}
        </div>
      </article>

      {menuOpen && (
        <PostMenu
          isOwner={isOwner}
          isFollowing={isFollowing}
          isArchived={localPost.archived}
          onFollow={handleFollow}
          onArchive={handleArchive}
          onDelete={() => { setMenuOpen(false); setConfirmDelete(true); }}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {confirmDelete && (
        <DeleteConfirm onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
      )}
    </>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function TrendingSidebar({
  followedAuthors,
  onFollowToggle,
  onToast,
  suggestedCreators,
  activeHashtag,
  onTagClick,
  onCreatorClick,
}: {
  followedAuthors: Set<string>;
  onFollowToggle: (id: string) => void;
  onToast: (msg: string) => void;
  suggestedCreators: Array<{
    id: string;
    name: string;
    role: SocialPost["authorRole"];
    sub: string;
  }>;
  activeHashtag: string | null;
  onTagClick: (tag: string) => void;
  onCreatorClick: (id: string, name?: string) => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 xl:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-[20px] bg-white p-5 shadow-[0_1px_8px_rgba(13,27,42,0.08)]">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-[var(--ms-rose)]" />
            <p className="text-sm font-bold text-[var(--ms-navy)]">Trending</p>
          </div>
          <div className="space-y-1">
            {TRENDING_TAGS.map((t, i) => {
              const isActive = activeHashtag === t.tag;
              return (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => onTagClick(t.tag)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[12px] px-2 py-2 transition group",
                    isActive
                      ? "bg-[var(--ms-petal)]"
                      : "hover:bg-[var(--ms-soft-bg)]",
                  )}
                >
                  <span className={cn(
                    "w-4 text-right text-[11px] font-bold",
                    isActive ? "text-[var(--ms-rose)]" : "text-[var(--ms-mauve)]",
                  )}>{i + 1}</span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className={cn(
                      "text-[13px] font-bold transition",
                      isActive ? "text-[var(--ms-plum)]" : "text-[var(--ms-navy)] group-hover:text-[var(--ms-plum)]",
                    )}>{t.tag}</p>
                    <p className="text-[11px] text-[var(--ms-mauve)]">{t.posts}</p>
                  </div>
                  {isActive && (
                    <span className="shrink-0 rounded-full bg-[var(--ms-plum)] px-2 py-0.5 text-[10px] font-bold text-white">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[20px] bg-white p-5 shadow-[0_1px_8px_rgba(13,27,42,0.08)]">
          <p className="mb-3 text-sm font-bold text-[var(--ms-navy)]">Suggested for you</p>
          <div className="space-y-3">
            {suggestedCreators.length === 0 ? (
              <p className="rounded-[16px] bg-[var(--ms-soft-bg)] px-4 py-5 text-xs leading-5 text-[var(--ms-mauve)]">
                Suggestions will appear after real clients, pros, and salons start posting.
              </p>
            ) : suggestedCreators.map((s) => {
              const following = followedAuthors.has(s.id);
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onCreatorClick(s.id, s.name)}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white bg-gradient-to-br transition hover:scale-105 hover:ring-2 hover:ring-[var(--ms-plum)] hover:ring-offset-1",
                      avatarGradient(s.role),
                    )}
                    title={`See ${s.name}'s posts`}
                  >
                    {s.name[0]}
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onCreatorClick(s.id, s.name)}
                      className="block truncate text-left text-[13px] font-bold text-[var(--ms-navy)] hover:text-[var(--ms-plum)] transition"
                    >
                      {s.name}
                    </button>
                    <p className="truncate text-[11px] text-[var(--ms-mauve)]">{s.sub}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onFollowToggle(s.id);
                      onToast(following ? `Unfollowed ${s.name}` : `Following ${s.name}`);
                    }}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-[12px] font-bold transition",
                      following
                        ? "border-[var(--ms-plum)] bg-[var(--ms-petal)] text-[var(--ms-plum)]"
                        : "border-[var(--ms-border)] text-[var(--ms-plum)] hover:bg-[var(--ms-petal)]",
                    )}
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <p className="px-1 text-[11px] text-[var(--ms-mauve)] leading-5">
          Mobile Salon · Beauty, softly handled · For women, by women · Kenya
        </p>
      </div>
    </aside>
  );
}

// ─── Compose sheet ────────────────────────────────────────────────────────────

function ComposeSheet({
  sessionId,
  sessionSlug,
  sessionRole,
  sessionName,
  sessionPhoto,
  onClose,
  onPublished,
}: {
  sessionId: string;
  sessionSlug?: string;
  sessionRole: AppUserSession["role"];
  sessionName: string;
  sessionPhoto: string | undefined;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [images,  setImages]  = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [tag,     setTag]     = useState<"portfolio" | "before_after" | "inspo" | "tip" | "promotion">("portfolio");

  const POST_TYPES: { key: typeof tag; label: string }[] = [
    { key: "portfolio",    label: "My Look"         },
    { key: "before_after", label: "Before / After"  },
    { key: "tip",          label: "Tutorial / Tip"  },
    { key: "inspo",        label: "Inspiration"     },
    { key: "promotion",    label: "Offer"           },
  ];

  const authorRole: SocialPost["authorRole"] =
    sessionRole === "professional" ? "professional" : sessionRole === "salon" ? "salon" : "client";

  function publish() {
    if (!caption.trim() && images.length === 0) return;
    const post: SocialPost = {
      id: `post_${Date.now()}`,
      authorId: sessionId,
      authorSlug: sessionSlug,
      authorName: sessionName,
      authorAvatar: sessionPhoto,
      authorRole,
      type: tag,
      images,
      caption,
      tags: caption.match(/#\w+/g) ?? [],
      likes: 0,
      savedBy: [],
      bookmarkedBy: [],
      repostedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    writePost(post);
    onPublished();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-[32px] bg-white shadow-[0_-20px_60px_rgba(13,27,42,0.22)] sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--ms-border)]" />
        <div className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <Avatar src={sessionPhoto} name={sessionName} role={authorRole} size={40} />
            <div>
              <p className="text-sm font-bold text-[var(--ms-navy)]">{sessionName}</p>
              <p className="text-xs text-[var(--ms-mauve)]">Sharing to everyone</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-full bg-[var(--ms-soft-bg)] p-2 text-[var(--ms-mauve)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {POST_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTag(t.key)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition",
                  tag === t.key
                    ? "bg-[var(--ms-plum)] text-white"
                    : "bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)]",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <ImageUploadEditor
            onSave={(url) => setImages((prev) => [...prev, url])}
            aspectHint="1/1"
            className="mb-3"
          />

          {images.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <div key={i} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[12px]">
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            className="mb-1 w-full resize-none rounded-[16px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-[13px] leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-border)] focus:border-[var(--ms-plum)] transition"
            rows={3}
            placeholder="Share your beauty moment… add #hashtags to reach more women"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <button
            type="button"
            onClick={publish}
            disabled={!caption.trim() && images.length === 0}
            className="mt-2 w-full rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] py-3.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(212,83,126,0.3)] transition hover:brightness-110 disabled:opacity-50"
          >
            Share now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[var(--ms-navy)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(13,27,42,0.28)]">
      {msg}
    </div>
  );
}

// ─── Main SocialHome ──────────────────────────────────────────────────────────

export function SocialHome() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initTab = (searchParams.get("tab") as FeedTab | null) ?? "foryou";

  const [session,           setSession]           = useState<AppUserSession | null>(null);
  const [realPosts,         setRealPosts]         = useState<SocialPost[]>([]);
  const [saves,             setSaves]             = useState<SocialSaves>({ professionals: [], salons: [] });
  const [followedAuthors,   setFollowedAuthors]   = useState<Set<string>>(new Set());
  const [activeTab,         setActiveTab]         = useState<FeedTab>(
    ["foryou", "following"].includes(initTab) ? initTab : "foryou",
  );
  const [activeRoomId,      setActiveRoomId]      = useState<RoomId>("r_all");
  const [showCompose,       setShowCompose]       = useState(false);
  const [toast,             setToast]             = useState<string | null>(null);
  const [deletedIds,        setDeletedIds]        = useState<Set<string>>(new Set());
  const [archivedIds,       setArchivedIds]       = useState<Set<string>>(new Set());
  const [refreshKey,        setRefreshKey]        = useState(0);
  const [allStories,        setAllStories]        = useState<Story[]>([]);
  const [showStoryCreate,   setShowStoryCreate]   = useState(false);
  const [viewingAuthorId,   setViewingAuthorId]   = useState<string | null>(null);
  const [activeHashtag,     setActiveHashtag]     = useState<string | null>(null);
  const [activeAuthorFilter,setActiveAuthorFilter] = useState<{ id: string; name: string } | null>(null);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  useEffect(() => {
    function sync() {
      const s = readAppSession();
      setSession(s);
      setRealPosts(readPosts());
      setSaves(readSaves());
      setFollowedAuthors(new Set(readFollowedAuthors()));
      setAllStories(readStories());
    }
    sync();
    window.addEventListener(APP_SESSION_EVENT,    sync);
    window.addEventListener(SOCIAL_CHANGE_EVENT,  sync);
    window.addEventListener(STORY_CHANGE_EVENT,   sync);
    window.addEventListener("storage",            sync);
    return () => {
      window.removeEventListener(APP_SESSION_EVENT,   sync);
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener(STORY_CHANGE_EVENT,  sync);
      window.removeEventListener("storage",           sync);
    };
  }, []);

  function handleFollowToggle(authorId: string) {
    const nowFollowing = toggleFollowAuthor(authorId);
    setFollowedAuthors((prev) => {
      const next = new Set(prev);
      if (nowFollowing) next.add(authorId);
      else next.delete(authorId);
      return next;
    });
  }

  if (!session) return null;

  const isGuest     = session.role === "guest";
  const sessionId   = session.id;
  const sessionRole = session.role;
  const sessionName = getSessionName(session);
  const sessionPhoto= getSessionPhoto(session);
  const sessionSlug = getSessionSlug(session);
  const canPost     = !isGuest;

  // Derive active category from active room
  const activeRoom     = ROOMS.find((r) => r.id === activeRoomId) ?? ROOMS[0];
  const activeCategory = activeRoom.filter;

  const allPosts = realPosts.filter((p) => !deletedIds.has(p.id) && !archivedIds.has(p.id));


  const suggestedCreators = Array.from(
    allPosts.reduce((map, post) => {
      if (!map.has(post.authorId) && post.authorId !== sessionId) {
        map.set(post.authorId, {
          id: post.authorId,
          name: post.authorName,
          role: post.authorRole,
          sub: [roleLabel(post.authorRole), post.location].filter(Boolean).join(" · "),
        });
      }
      return map;
    }, new Map<string, { id: string; name: string; role: SocialPost["authorRole"]; sub: string }>()),
  ).map(([, creator]) => creator).slice(0, 4);

  // Following tab
  const followedIds = new Set([
    ...followedAuthors,
    ...saves.professionals,
    ...saves.salons,
  ]);

  const feedPosts =
    activeTab === "following"
      ? allPosts.filter((p) => followedIds.has(p.authorId) || p.authorId === sessionId)
      : allPosts;

  const categoryPosts =
    activeCategory === "all"
      ? feedPosts
      : feedPosts.filter((p) => p.type === activeCategory);

  const hashtagPosts = activeHashtag
    ? categoryPosts.filter(
        (p) =>
          p.tags.some((t) => t.toLowerCase() === activeHashtag.toLowerCase()) ||
          p.caption.toLowerCase().includes(activeHashtag.toLowerCase()),
      )
    : categoryPosts;

  const filteredPosts = activeAuthorFilter
    ? hashtagPosts.filter((p) => p.authorId === activeAuthorFilter.id)
    : hashtagPosts;

  return (
    <>
      <div className="mx-auto flex max-w-[960px] items-start gap-6 px-4 pb-28 pt-3 lg:px-6">
        {/* ── Feed column ───────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">

          {/* Greeting + daily check-in — only for logged-in users */}
          {!isGuest && (
            <div className="mb-4 space-y-2.5">
              <GreetingBanner />
              <DailyCheckIn />
            </div>
          )}

          {/* Stories row */}
          <StoriesRow
            sessionId={sessionId}
            sessionName={sessionName}
            sessionPhoto={sessionPhoto}
            sessionRole={sessionRole}
            allStories={allStories}
            onAddStory={() => canPost ? setShowStoryCreate(true) : showToast("Create a free account to add a story")}
            onViewStory={(authorId) => setViewingAuthorId(authorId)}
          />

          {/* Rooms navigation bar */}
          <div className="-mx-4 lg:-mx-6">
            <RoomsBar
              activeRoomId={activeRoomId}
              onSelect={(room) => {
                setActiveRoomId(room.id);
                setActiveHashtag(null);
                setActiveAuthorFilter(null);
              }}
            />
          </div>

          {/* Active filter banner */}
          {(activeHashtag || activeAuthorFilter) && (
            <div className="mb-2 flex items-center gap-2 rounded-[16px] bg-[var(--ms-petal)] px-4 py-2.5">
              <Flame className="h-3.5 w-3.5 shrink-0 text-[var(--ms-rose)]" />
              <p className="flex-1 text-[13px] font-semibold text-[var(--ms-plum)]">
                {activeHashtag
                  ? <>Showing posts tagged <span className="font-bold">{activeHashtag}</span></>
                  : <>Posts by <span className="font-bold">{activeAuthorFilter!.name}</span></>}
              </p>
              <button
                type="button"
                onClick={() => { setActiveHashtag(null); setActiveAuthorFilter(null); }}
                className="rounded-full bg-[var(--ms-plum)] px-3 py-1 text-[11px] font-bold text-white"
              >
                Clear ✕
              </button>
            </div>
          )}

          {/* Guest banner */}
          {isGuest && (
            <div className="mb-3 flex items-center gap-3 rounded-[18px] bg-[var(--ms-petal)] px-4 py-3.5">
              <div className="flex-1">
                <p className="text-[13px] font-bold text-[var(--ms-plum)]">Browsing as a guest</p>
                <p className="text-[11px] text-[var(--ms-mauve)]">
                  Create a free account to like, post, follow, save, and book.
                </p>
                <Link
                  href="/signup/client"
                  className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--ms-plum)] px-4 py-1.5 text-[12px] font-bold text-white"
                >
                  Join free
                </Link>
              </div>
            </div>
          )}

          {/* For You / Following tabs — sticky */}
          <div className="sticky top-[56px] z-20 -mx-4 lg:-mx-6 mb-4">
            <div className="flex border-b border-[var(--ms-border)]/60 bg-white/95 backdrop-blur-md px-4 lg:px-6">
              {(["foryou", "following"] as FeedTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setActiveTab(t); setActiveHashtag(null); setActiveAuthorFilter(null); }}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-bold transition-colors",
                    activeTab === t
                      ? "text-[var(--ms-navy)]"
                      : "text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]",
                  )}
                >
                  {t === "foryou"
                    ? <><Sparkles className="h-4 w-4" /> For You</>
                    : <><Users className="h-4 w-4" /> Following</>}
                  {activeTab === t && (
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-10 rounded-full"
                      style={{ background: "linear-gradient(90deg,var(--ms-rose),var(--ms-orchid))" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {filteredPosts.length === 0 && (
            <div className="rounded-[20px] bg-white py-14 text-center shadow-[0_1px_8px_rgba(13,27,42,0.08)]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ms-petal)]">
                <Sparkles className="h-7 w-7 text-[var(--ms-rose)]" />
              </div>
              <p className="text-[14px] font-bold text-[var(--ms-navy)]">
                {activeTab === "following" ? "Your feed is waiting" : "Nothing here yet"}
              </p>
              <p className="mt-1 text-[12px] text-[var(--ms-mauve)]">
                {activeTab === "following"
                  ? "Follow creators to fill your feed with beauty."
                  : "Be the first to share your beauty moment."}
              </p>
              <button
                type="button"
                onClick={() => canPost ? setShowCompose(true) : showToast("Join free to post")}
                className="mt-4 rounded-full px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(212,83,126,0.3)]"
                style={{ background: "linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))" }}
              >
                {canPost ? "Share now" : "Join free"}
              </button>
              {activeTab === "following" && (
                <button
                  type="button"
                  onClick={() => { setActiveTab("foryou"); setActiveRoomId("r_all"); }}
                  className="ml-3 mt-4 rounded-full bg-[var(--ms-petal)] px-5 py-2.5 text-[13px] font-bold text-[var(--ms-plum)]"
                >
                  Explore all
                </button>
              )}
            </div>
          )}

          {/* Single-column feed */}
          <div className="space-y-0">
            {filteredPosts.map((post) => (
              <div key={`${post.id}_${refreshKey}`} className="border-b border-[var(--ms-border)]/40 last:border-0">
                <PostCard
                  post={post}
                  variant="hero"
                  sessionId={sessionId}
                  sessionRole={sessionRole}
                  sessionPhoto={sessionPhoto}
                  sessionName={sessionName}
                  onToast={showToast}
                  followedAuthors={followedAuthors}
                  onFollowToggle={handleFollowToggle}
                  onDeleted={(id) => {
                    setDeletedIds((prev) => new Set([...prev, id]));
                    showToast("Post deleted");
                  }}
                  onArchived={(id) => {
                    setArchivedIds((prev) => new Set([...prev, id]));
                    setRefreshKey((k) => k + 1);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Desktop sidebar ───────────────────────────────────────── */}
        <TrendingSidebar
          followedAuthors={followedAuthors}
          onFollowToggle={handleFollowToggle}
          onToast={showToast}
          suggestedCreators={suggestedCreators}
          activeHashtag={activeHashtag}
          onTagClick={(tag) => {
            setActiveHashtag((prev) => (prev === tag ? null : tag));
            setActiveAuthorFilter(null);
            setActiveTab("foryou");
          }}
          onCreatorClick={(id) => {
            router.push(`/u/${id}`);
          }}
        />
      </div>

      {/* FAB — compose */}
      <button
        type="button"
        onClick={() =>
          canPost
            ? setShowCompose(true)
            : showToast("Create a free account to post")
        }
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] text-white shadow-[0_8px_28px_rgba(212,83,126,0.4)] transition hover:scale-105 hover:brightness-110 lg:bottom-8 lg:right-8"
        aria-label="Create post"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Compose sheet */}
      {/* Story modals */}
      {showStoryCreate && session && session.role !== "guest" && (
        <StoryCreateModal
          session={session}
          onClose={() => setShowStoryCreate(false)}
          onPosted={() => {
            setShowStoryCreate(false);
            setAllStories(readStories());
            showToast("Story added — visible for 24 hours");
          }}
        />
      )}
      {viewingAuthorId && (
        <StoryViewerModal
          authorId={viewingAuthorId}
          allStories={allStories}
          onClose={() => setViewingAuthorId(null)}
        />
      )}

      {showCompose && canPost && (
        <ComposeSheet
          sessionId={sessionId}
          sessionSlug={sessionSlug}
          sessionRole={sessionRole}
          sessionName={sessionName}
          sessionPhoto={sessionPhoto}
          onClose={() => setShowCompose(false)}
          onPublished={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </>
  );
}
