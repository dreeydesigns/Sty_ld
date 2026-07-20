"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Heart,
  MapPin,
  MessageCircle,
  Scissors,
  Sparkles,
  Star,
} from "lucide-react";

import {
  readPosts,
  readFollowedAuthors,
  toggleFollowAuthor,
  SOCIAL_CHANGE_EVENT,
  type SocialPost,
} from "@/lib/social-store";
import {
  readAppSession,
  APP_SESSION_EVENT,
  type AppUserSession,
} from "@/lib/client-session";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role: SocialPost["authorRole"]): string {
  if (role === "professional") return "Professional";
  if (role === "salon") return "Salon";
  return "Client";
}

function roleGradient(role: SocialPost["authorRole"]): string {
  if (role === "professional") return "from-purple-500 to-purple-700";
  if (role === "salon") return "from-rose-500 to-red-700";
  return "from-teal-400 to-teal-600";
}

function roleBadge(role: SocialPost["authorRole"]): string {
  if (role === "professional") return "bg-[#F0EBFF] text-[#7C3AED]";
  if (role === "salon") return "bg-[#FEF0F3] text-[#C8284A]";
  return "bg-[#E6FBF4] text-[#0D9488]";
}

function typeLabel(type: SocialPost["type"]): string {
  const map: Record<SocialPost["type"], string> = {
    portfolio: "Look",
    before_after: "Before · After",
    inspo: "Inspo",
    tip: "Tip",
    promotion: "Offer",
  };
  return map[type] ?? type;
}

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Post tile ────────────────────────────────────────────────────────────────

function PostTile({
  post,
  onClick,
}: {
  post: SocialPost;
  onClick: () => void;
}) {
  const hasImage = post.images.length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-[20px] bg-white text-left shadow-[0_2px_12px_rgba(13,27,42,0.09)] transition hover:shadow-[0_8px_28px_rgba(58,24,58,0.16)] hover:-translate-y-0.5"
    >
      {/* Image */}
      {hasImage ? (
        <div className="relative w-full overflow-hidden" style={{ paddingBottom: "120%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.images[0]}
            alt={post.caption.slice(0, 60)}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* type badge */}
          <div className="absolute left-2.5 top-2.5">
            <span className="rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-bold text-[var(--ms-plum)] backdrop-blur-sm">
              {typeLabel(post.type)}
            </span>
          </div>

          {/* bottom stats */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/90">
              <Heart className="h-3 w-3" strokeWidth={2.5} />
              {fmtCount(post.likes)}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/90">
              <MessageCircle className="h-3 w-3" strokeWidth={2.5} />
              {fmtCount(post.comments.length)}
            </span>
          </div>
        </div>
      ) : (
        /* Text-only post */
        <div className="flex min-h-[160px] flex-col justify-between p-4">
          <span className="mb-2 inline-block rounded-full bg-[var(--ms-petal)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--ms-plum)]">
            {typeLabel(post.type)}
          </span>
          <p className="text-[13px] font-medium leading-6 text-[var(--ms-charcoal)] line-clamp-5">
            {post.caption}
          </p>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--ms-mauve)]">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" strokeWidth={2} />
              {fmtCount(post.likes)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" strokeWidth={2} />
              {fmtCount(post.comments.length)}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

// ─── Expanded post sheet ───────────────────────────────────────────────────────

function PostSheet({ post, onClose }: { post: SocialPost; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--ms-border)] bg-white/95 px-5 py-3.5 backdrop-blur-sm">
          <span className="rounded-full bg-[var(--ms-petal)] px-3 py-1 text-[11px] font-bold text-[var(--ms-plum)]">
            {typeLabel(post.type)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]"
          >
            ✕
          </button>
        </div>

        {/* Image carousel */}
        {post.images.length > 0 && (
          <div className="relative w-full overflow-hidden bg-black" style={{ paddingBottom: "75%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.images[0]}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          <p className="text-[14px] leading-7 text-[var(--ms-charcoal)]">{post.caption}</p>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-[var(--ms-petal)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ms-plum)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="mt-4 flex items-center gap-5 border-t border-[var(--ms-border)] pt-4">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ms-mauve)]">
              <Heart className="h-4 w-4 text-[var(--ms-rose)]" strokeWidth={2} />
              {fmtCount(post.likes)} likes
            </span>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ms-mauve)]">
              <MessageCircle className="h-4 w-4 text-[var(--ms-mauve)]" strokeWidth={2} />
              {post.comments.length} comments
            </span>
            <span className="ml-auto text-[11px] text-[var(--ms-mauve)]">{timeAgo(post.createdAt)}</span>
          </div>

          {/* Comments preview */}
          {post.comments.length > 0 && (
            <div className="mt-4 space-y-3">
              {post.comments.slice(0, 3).map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-[10px] font-bold text-white">
                    {c.authorName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[12px] font-bold text-[var(--ms-navy)]">{c.authorName} </span>
                    <span className="text-[12px] text-[var(--ms-charcoal)]">{c.text}</span>
                  </div>
                </div>
              ))}
              {post.comments.length > 3 && (
                <p className="text-[11px] text-[var(--ms-mauve)]">+{post.comments.length - 3} more comments</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Profile page ──────────────────────────────────────────────────────────────

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [posts,          setPosts]         = useState<SocialPost[]>([]);
  const [session,        setSession]       = useState<AppUserSession | null>(null);
  const [isFollowing,    setIsFollowing]   = useState(false);
  const [expandedPost,   setExpandedPost]  = useState<SocialPost | null>(null);
  const [scrolled,       setScrolled]      = useState(false);

  // Load data
  useEffect(() => {
    function sync() {
      const allPosts = readPosts();
      setPosts(allPosts.filter((p) => p.authorId === id && !p.deleted && !p.archived));
      setSession(readAppSession());
      setIsFollowing(readFollowedAuthors().includes(id));
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
  }, [id]);

  // Sticky header on scroll
  useEffect(() => {
    const el = document.getElementById("profile-scroll");
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 140);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  function handleFollow() {
    const nowFollowing = toggleFollowAuthor(id);
    setIsFollowing(nowFollowing);
  }

  // Derive author info from first post
  const author = posts[0] ?? null;
  const authorName     = author?.authorName ?? "Beauty Creator";
  const authorRole     = author?.authorRole ?? "client";
  const authorPhoto    = author?.authorAvatar;
  const authorLocation = author?.location ?? "";

  const isOwnProfile = session?.id === id;
  const totalLikes   = posts.reduce((sum, p) => sum + p.likes, 0);

  if (!author && posts.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--ms-soft-bg)] px-4 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--ms-petal)]">
          <Sparkles className="h-10 w-10 text-[var(--ms-rose)]" />
        </div>
        <p className="text-[17px] font-bold text-[var(--ms-navy)]">No posts yet</p>
        <p className="mt-2 text-[14px] text-[var(--ms-mauve)]">This creator hasn&apos;t shared anything yet.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-6 rounded-full bg-[var(--ms-plum)] px-6 py-2.5 text-[14px] font-bold text-white"
        >
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div id="profile-scroll" className="relative min-h-screen overflow-y-auto bg-[var(--ms-soft-bg)]">

      {/* ── Sticky slim nav ── */}
      <div
        className={cn(
          "sticky top-0 z-30 flex items-center gap-3 px-4 py-3 transition-all duration-200",
          scrolled
            ? "bg-white/95 shadow-[0_1px_8px_rgba(13,27,42,0.1)] backdrop-blur-md"
            : "bg-transparent",
        )}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition",
            scrolled
              ? "border-[var(--ms-border)] bg-white text-[var(--ms-navy)]"
              : "border-white/30 bg-white/15 text-white backdrop-blur-sm",
          )}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>
        {scrolled && (
          <p className="flex-1 truncate text-[15px] font-bold text-[var(--ms-navy)]">{authorName}</p>
        )}
        {scrolled && (
          <button
            type="button"
            onClick={handleFollow}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-[12px] font-bold transition",
              isFollowing
                ? "bg-[var(--ms-petal)] text-[var(--ms-plum)]"
                : "bg-[var(--ms-plum)] text-white",
            )}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {/* ── Hero header ── */}
      <div className="-mt-[52px] relative">
        {/* Cover band */}
        <div
          className="h-52 w-full"
          style={{
            background: "linear-gradient(135deg, var(--ms-plum) 0%, #6d1a6d 45%, var(--ms-orchid) 100%)",
          }}
        >
          {/* decorative petals */}
          <div className="absolute right-8 top-6 h-20 w-20 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute left-12 top-10 h-14 w-14 rounded-full bg-white/8 blur-xl" />
        </div>

        {/* Avatar — straddles the cover */}
        <div className="relative mx-auto -mt-16 flex w-full max-w-2xl flex-col items-center px-5">
          <div className="relative">
            <div
              className={cn(
                "flex h-28 w-28 items-center justify-center rounded-full text-3xl font-black text-white ring-4 ring-white ring-offset-2 shadow-[0_0_0_3px_rgba(201,168,76,0.5)]",
                "bg-gradient-to-br",
                roleGradient(authorRole),
              )}
              style={authorPhoto ? { backgroundImage: `url(${authorPhoto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
            >
              {!authorPhoto && authorName[0]?.toUpperCase()}
            </div>

            {/* Gold sparkle ring for verified / professional */}
            {authorRole !== "client" && (
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ms-gold)] ring-2 ring-white">
                {authorRole === "professional"
                  ? <Scissors className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                  : <Star className="h-3.5 w-3.5 text-white fill-white" />}
              </div>
            )}
          </div>

          {/* Name + role + location */}
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-[22px] font-black tracking-[-0.01em] text-[var(--ms-navy)]">
                {authorName}
              </h1>
              {authorRole !== "client" && (
                <BadgeCheck className="h-5 w-5 text-[var(--ms-plum)]" strokeWidth={2} />
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
              <span className={cn("rounded-full px-3 py-0.5 text-[11px] font-bold", roleBadge(authorRole))}>
                {roleLabel(authorRole)}
              </span>
              {authorLocation && (
                <span className="flex items-center gap-1 text-[12px] text-[var(--ms-mauve)]">
                  <MapPin className="h-3 w-3" strokeWidth={2} />
                  {authorLocation}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 flex w-full max-w-xs divide-x divide-[var(--ms-border)] overflow-hidden rounded-[18px] bg-white shadow-[0_2px_12px_rgba(13,27,42,0.09)]">
            <div className="flex flex-1 flex-col items-center py-3.5">
              <p className="text-[18px] font-black text-[var(--ms-navy)]">{posts.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ms-mauve)]">
                {posts.length === 1 ? "Look" : "Looks"}
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center py-3.5">
              <p className="text-[18px] font-black text-[var(--ms-navy)]">{fmtCount(totalLikes)}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ms-mauve)]">
                Hearts
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center py-3.5">
              <p className="text-[18px] font-black text-[var(--ms-navy)]">
                {posts.reduce((s, p) => s + p.comments.length, 0)}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ms-mauve)]">
                Replies
              </p>
            </div>
          </div>

          {/* Follow / Message / Book CTAs */}
          {!isOwnProfile && (
            <div className="mt-4 flex w-full max-w-xs gap-2">
              <button
                type="button"
                onClick={handleFollow}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-bold transition",
                  isFollowing
                    ? "bg-[var(--ms-petal)] text-[var(--ms-plum)] hover:bg-red-50 hover:text-red-600"
                    : "bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-white shadow-[0_4px_16px_rgba(58,24,58,0.28)]",
                )}
              >
                {isFollowing ? "✓ Following" : "+ Follow"}
              </button>

              {authorRole !== "client" && (
                <Link
                  href={author?.authorSlug ? `/book/${author.authorSlug}` : "/explore"}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--ms-plum)] bg-white py-2.5 text-[13px] font-bold text-[var(--ms-plum)] transition hover:bg-[var(--ms-petal)]"
                >
                  <Scissors className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Book
                </Link>
              )}
            </div>
          )}

          {isOwnProfile && (
            <div className="mt-4">
              <Link
                href="/settings/edit-profile"
                className="rounded-full border border-[var(--ms-border)] bg-white px-6 py-2.5 text-[13px] font-bold text-[var(--ms-navy)] shadow-sm transition hover:border-[var(--ms-plum)]"
              >
                Edit profile
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Section divider ── */}
      <div className="mx-auto mt-8 max-w-2xl px-5">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--ms-border)]" />
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--ms-petal)] px-3 py-1">
            <Sparkles className="h-3 w-3 text-[var(--ms-rose)]" />
            <span className="text-[11px] font-bold text-[var(--ms-plum)]">
              {posts.length > 0 ? `${posts.length} ${posts.length === 1 ? "post" : "posts"}` : "No posts yet"}
            </span>
          </div>
          <div className="h-px flex-1 bg-[var(--ms-border)]" />
        </div>
      </div>

      {/* ── Posts grid ── */}
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-5">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ms-petal)]">
              <Bookmark className="h-7 w-7 text-[var(--ms-rose)]" />
            </div>
            <p className="text-[15px] font-bold text-[var(--ms-navy)]">Nothing shared yet</p>
            <p className="mt-1 text-[13px] text-[var(--ms-mauve)]">
              {isOwnProfile
                ? "Share your first beauty look to start your portfolio."
                : "Check back soon — their looks will appear here."}
            </p>
          </div>
        ) : (
          /* 2-column masonry grid — editorial, not Instagram's rigid squares */
          <div className="columns-2 gap-3 space-y-3 [column-fill:balance]">
            {posts.map((post) => (
              <div key={post.id} className="break-inside-avoid">
                <PostTile post={post} onClick={() => setExpandedPost(post)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Expanded post sheet ── */}
      {expandedPost && (
        <PostSheet post={expandedPost} onClose={() => setExpandedPost(null)} />
      )}

      {/* ── Footer ── */}
      <div className="pb-8 pt-2 text-center">
        <p className="text-[11px] text-[var(--ms-mauve)]">Mobile Salon · Beauty, softly handled</p>
      </div>
    </div>
  );
}
