"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import {
  getAcceptedTeamBySalonSlug,
  TEAM_CHANGE_EVENT,
  type TeamMember,
} from "@/lib/team-store";
import { readPosts, SOCIAL_CHANGE_EVENT, type SocialPost } from "@/lib/social-store";

// ─── Public team section (embedded in salon detail page) ─────────────────────

export function SalonLiveTeamSection({ salonSlug }: { salonSlug: string }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [creditedPosts, setCreditedPosts] = useState<SocialPost[]>([]);

  useEffect(() => {
    function sync() {
      const team = getAcceptedTeamBySalonSlug(salonSlug);
      setMembers(team);
      if (team.length > 0) {
        const ids = new Set(team.map((m) => m.linkedAccountId).filter(Boolean));
        setCreditedPosts(
          readPosts().filter(
            (p) => p.creditedToMemberId && ids.has(p.creditedToMemberId),
          ),
        );
      }
    }
    sync();
    window.addEventListener(TEAM_CHANGE_EVENT, sync);
    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TEAM_CHANGE_EVENT, sync);
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [salonSlug]);

  // Only render if there are accepted team members
  if (members.length === 0) return null;

  return (
    <section className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Team</p>
      <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-navy)]">The artists behind this salon</h2>
      <p className="mt-2 text-sm leading-7 text-[var(--ms-mauve)]">
        Each team member has their own specialty. Click their card to see their work.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <TeamMemberPublicCard
            key={member.id}
            member={member}
            posts={creditedPosts.filter((p) => p.creditedToMemberId === member.linkedAccountId)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Individual team card ─────────────────────────────────────────────────────

function TeamMemberPublicCard({
  member,
  posts,
}: {
  member: TeamMember;
  posts: SocialPost[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--ms-border)] bg-white shadow-[0_4px_12px_rgba(13,27,42,0.05)] transition hover:shadow-[0_8px_24px_rgba(13,27,42,0.10)]">
      {/* Card header */}
      <div className="flex items-center gap-3 p-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-xl font-bold text-white">
          {member.profilePhoto ? (
            <img
              src={member.profilePhoto}
              alt={member.firstName}
              className="h-full w-full object-cover"
            />
          ) : (
            member.firstName[0].toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--ms-navy)]">{member.firstName}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ms-petal)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ms-plum)]">
            <Sparkles className="h-3 w-3" />
            {member.specialty}
          </span>
          {member.bio && (
            <p className="mt-1.5 text-xs leading-5 text-[var(--ms-mauve)] line-clamp-2">
              {member.bio}
            </p>
          )}
        </div>
      </div>

      {/* Portfolio preview (up to 3 credited photos) */}
      {posts.length > 0 && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mb-2 text-[11px] font-semibold text-[var(--ms-plum)] hover:underline"
          >
            {expanded ? "Hide work" : `See ${member.firstName}'s work (${posts.length} photo${posts.length !== 1 ? "s" : ""})`}
          </button>
          {expanded && (
            <div className="grid grid-cols-3 gap-1">
              {posts.slice(0, 6).map((post) =>
                post.images[0] ? (
                  <div
                    key={post.id}
                    className="aspect-square overflow-hidden rounded-[10px] bg-[var(--ms-soft-bg)]"
                  >
                    <img
                      src={post.images[0]}
                      alt={post.caption}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null,
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
