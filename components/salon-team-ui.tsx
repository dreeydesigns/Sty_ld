"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Copy,
  ImagePlus,
  Link2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Send,
  Settings,
  Sparkles,
  Store,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { ImageUploadEditor } from "@/components/image-upload-editor";
import {
  APP_SESSION_EVENT,
  writeAppSession,
  type SalonUserProfile,
  type TeamMemberProfile,
} from "@/lib/client-session";
import {
  readPosts,
  writePost,
  SOCIAL_CHANGE_EVENT,
  type SocialPost,
} from "@/lib/social-store";
import {
  addTeamMember,
  calcEarningsSplit,
  generateInviteUrl,
  getTeamMembers,
  maxFreelancerSlots,
  removeTeamMember,
  updateTeamMember,
  TEAM_CHANGE_EVENT,
  type TeamMember,
} from "@/lib/team-store";
import { cn } from "@/lib/utils";

// ─── Salon admin: Team management panel ───────────────────────────────────────

export function SalonTeamPanel({
  session,
  onSave,
}: {
  session: SalonUserProfile;
  onSave: (s: SalonUserProfile) => void;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const maxSlots = maxFreelancerSlots(session.plan);
  const slotsUsed = members.length;

  useEffect(() => {
    function sync() {
      setMembers(getTeamMembers(session.id));
    }
    sync();
    window.addEventListener(TEAM_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TEAM_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [session.id]);

  function handleCopyLink(token: string) {
    const url = generateInviteUrl(token);
    navigator.clipboard.writeText(url).catch(() => {/* silent */});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function handleRemove(memberId: string) {
    if (!confirm("Remove this team member? Their uploaded portfolio photos stay with the salon.")) return;
    removeTeamMember(memberId);
    // Update salon teamCount
    onSave({ ...session, teamCount: Math.max(0, session.teamCount - 1) });
  }

  return (
    <div className="mt-5 space-y-4">
      {/* Header + slot info */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--ms-navy)]">Your team</h2>
          <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">
            {slotsUsed} of {maxSlots} freelancer slot{maxSlots !== 1 ? "s" : ""} used
          </p>
        </div>
        {slotsUsed < maxSlots && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-full bg-[var(--ms-plum)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Add member
          </button>
        )}
      </div>

      {/* Upgrade nudge when at limit */}
      {slotsUsed >= maxSlots && (
        <div className="rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--ms-navy)]">
            You&apos;ve used your {maxSlots} freelancer slot{maxSlots !== 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">
            Upgrade your plan to add up to 10 team members — Salon Growth gives you 3, Premium gives you 10.
          </p>
          <Link
            href="/settings"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ms-plum)] hover:underline"
          >
            Upgrade plan <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 && (
        <div className="flex flex-col items-center rounded-[28px] border border-dashed border-[var(--ms-border)] bg-[var(--ms-soft-bg)] py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_rgba(13,27,42,0.06)]">
            <Users className="h-7 w-7 text-[var(--ms-mauve)] opacity-60" />
          </div>
          <p className="mt-4 text-sm font-semibold text-[var(--ms-navy)]">No team members yet</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--ms-mauve)]">
            Add a team member. They&apos;ll get an invite link you can send via WhatsApp or SMS.
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-4 flex items-center gap-1.5 rounded-full bg-[var(--ms-plum)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Add first team member
          </button>
        </div>
      )}

      {/* Team member cards */}
      <div className="space-y-3">
        {members.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            onCopyLink={() => handleCopyLink(member.inviteToken)}
            onRemove={() => handleRemove(member.id)}
            onEdit={() => setEditingMember(member)}
            copied={copiedToken === member.inviteToken}
          />
        ))}
      </div>

      {/* Ownership rule reminder */}
      {members.length > 0 && (
        <div className="rounded-[16px] bg-[var(--ms-soft-bg)] px-4 py-3">
          <p className="text-[11px] leading-5 text-[var(--ms-mauve)]">
            <strong className="text-[var(--ms-navy)]">Portfolio ownership rule:</strong> Photos uploaded by team members are credited to the artist but owned by your salon. Removing a team member does not delete their contributions.
          </p>
        </div>
      )}

      {/* Add member sheet */}
      {showAdd && (
        <AddTeamMemberSheet
          session={session}
          onSave={onSave}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit commission sheet */}
      {editingMember && (
        <EditTeamMemberSheet
          member={editingMember}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  );
}

// ─── Team member card (inside salon admin view) ───────────────────────────────

function TeamMemberCard({
  member,
  onCopyLink,
  onRemove,
  onEdit,
  copied,
}: {
  member: TeamMember;
  onCopyLink: () => void;
  onRemove: () => void;
  onEdit: () => void;
  copied: boolean;
}) {
  const split = calcEarningsSplit(1000, member.commissionPct);
  const salonPct = Math.round((split.salon / 900) * 100);

  return (
    <div className="rounded-[24px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_4px_12px_rgba(13,27,42,0.05)]">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-lg font-bold text-white">
          {member.profilePhoto ? (
            <img src={member.profilePhoto} alt={member.firstName} className="h-full w-full rounded-full object-cover" />
          ) : (
            member.firstName[0].toUpperCase()
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[var(--ms-navy)]">{member.firstName}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                member.inviteStatus === "accepted"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700",
              )}
            >
              {member.inviteStatus === "accepted" ? "Active" : "Invite pending"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">{member.specialty}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-[var(--ms-mauve)]">
            <Phone className="h-3 w-3" /> {member.phone}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[var(--ms-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ms-plum)] transition hover:border-[var(--ms-plum)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-500 transition hover:border-red-300 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Commission split */}
      <div className="mt-3 flex gap-2">
        {[
          { label: "Platform",  value: `10%`,              color: "bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)]" },
          { label: "You",       value: `${salonPct}%`,      color: "bg-[var(--ms-petal)] text-[var(--ms-plum)]"   },
          { label: member.firstName, value: `${member.commissionPct}%`, color: "bg-emerald-50 text-emerald-700" },
        ].map((row) => (
          <div key={row.label} className={cn("flex-1 rounded-[14px] px-3 py-2 text-center", row.color)}>
            <p className="text-[10px] font-semibold uppercase tracking-wide">{row.label}</p>
            <p className="text-sm font-bold">{row.value}</p>
          </div>
        ))}
      </div>

      {/* Copy invite link (for pending) */}
      {member.inviteStatus === "pending" && (
        <button
          type="button"
          onClick={onCopyLink}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] py-2.5 text-sm font-semibold text-[var(--ms-plum)] transition hover:border-[var(--ms-plum)]"
        >
          {copied ? (
            <><Check className="h-4 w-4 text-emerald-600" /> Link copied!</>
          ) : (
            <><Link2 className="h-4 w-4" /> Copy invite link (send via WhatsApp / SMS)</>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Add team member sheet ────────────────────────────────────────────────────

function AddTeamMemberSheet({
  session,
  onSave,
  onClose,
}: {
  session: SalonUserProfile;
  onSave: (s: SalonUserProfile) => void;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [commissionPct, setCommissionPct] = useState(20);
  const [done, setDone] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  function handleAdd() {
    if (!firstName.trim() || !phone.trim()) return;
    const member = addTeamMember(session.id, session.salonName, session.publicSlug, {
      firstName: firstName.trim(),
      phone: phone.trim(),
      specialty: specialty.trim() || "Stylist",
      commissionPct,
    });
    setInviteUrl(generateInviteUrl(member.inviteToken));
    onSave({ ...session, teamCount: session.teamCount + 1 });
    setDone(true);
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl).catch(() => {/* silent */});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const salonPct = 90 - commissionPct;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-[32px] bg-white p-5 shadow-[0_-18px_60px_rgba(13,27,42,0.18)] sm:rounded-[32px]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--ms-navy)]">
              {done ? "Invite created" : "Add team member"}
            </h2>
            <p className="text-xs text-[var(--ms-mauve)]">
              {done ? "Share the link via WhatsApp or SMS" : "They'll receive an invite link to set up their account"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[var(--ms-soft-bg)] p-2">
            <X className="h-4 w-4 text-[var(--ms-mauve)]" />
          </button>
        </div>

        {!done ? (
          /* ── Entry form ── */
          <div className="space-y-3">
            <TeamField icon={<UserRound className="h-4 w-4" />} label="First name" value={firstName} onChange={setFirstName} placeholder="e.g. Amina" />
            <TeamField icon={<Phone className="h-4 w-4" />} label="Phone number" value={phone} onChange={setPhone} placeholder="0712 345 678" type="tel" />
            <TeamField icon={<Sparkles className="h-4 w-4" />} label="Specialty" value={specialty} onChange={setSpecialty} placeholder="e.g. Hair braiding, Nails, Lashes" />

            {/* Commission slider */}
            <div className="rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
                  Commission split
                </span>
                <span className="text-xs font-bold text-[var(--ms-plum)]">{commissionPct}% to {firstName || "member"}</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value))}
                className="w-full accent-[var(--ms-plum)]"
              />
              <div className="mt-2 flex gap-2 text-center text-[10px]">
                <div className="flex-1 rounded-[10px] bg-[var(--ms-soft-bg)] py-1.5 text-[var(--ms-mauve)]">Platform 10%</div>
                <div className="flex-1 rounded-[10px] bg-[var(--ms-petal)] py-1.5 font-semibold text-[var(--ms-plum)]">You {salonPct}%</div>
                <div className="flex-1 rounded-[10px] bg-emerald-50 py-1.5 font-semibold text-emerald-700">{firstName || "Them"} {commissionPct}%</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!firstName.trim() || !phone.trim()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add {firstName.trim() || "team member"} &amp; generate invite
            </button>
          </div>
        ) : (
          /* ── Success: show invite link ── */
          <div className="space-y-4">
            <div className="rounded-[20px] bg-emerald-50 p-4 text-center">
              <Check className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-2 font-semibold text-emerald-700">{firstName} has been added</p>
              <p className="mt-1 text-xs text-emerald-600">Share the invite link so they can set up their account.</p>
            </div>

            <div className="rounded-[18px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Invite link</p>
              <p className="break-all text-xs font-mono text-[var(--ms-navy)]">{inviteUrl}</p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-sm font-semibold text-white transition hover:brightness-110"
            >
              {copied ? (
                <><Check className="h-4 w-4" /> Copied to clipboard</>
              ) : (
                <><Copy className="h-4 w-4" /> Copy link — paste in WhatsApp</>
              )}
            </button>

            <p className="text-center text-[11px] leading-5 text-[var(--ms-mauve)]">
              The link is unique to {firstName}. When they tap it, they&apos;ll be guided to create their account and link to your salon automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit team member commission sheet ────────────────────────────────────────

function EditTeamMemberSheet({
  member,
  onClose,
}: {
  member: TeamMember;
  onClose: () => void;
}) {
  const [commissionPct, setCommissionPct] = useState(member.commissionPct);
  const [specialty, setSpecialty] = useState(member.specialty);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    updateTeamMember(member.id, { commissionPct, specialty });
    setSaved(true);
    setTimeout(onClose, 1200);
  }

  const salonPct = 90 - commissionPct;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-[32px] bg-white p-5 shadow-[0_-18px_60px_rgba(13,27,42,0.18)] sm:rounded-[32px]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--ms-navy)]">Edit {member.firstName}</h2>
            <p className="text-xs text-[var(--ms-mauve)]">Adjust specialty or commission split</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[var(--ms-soft-bg)] p-2">
            <X className="h-4 w-4 text-[var(--ms-mauve)]" />
          </button>
        </div>

        <div className="space-y-3">
          <TeamField icon={<Sparkles className="h-4 w-4" />} label="Specialty" value={specialty} onChange={setSpecialty} />

          <div className="rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Commission</span>
              <span className="text-xs font-bold text-[var(--ms-plum)]">{commissionPct}% to {member.firstName}</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={commissionPct}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
              className="w-full accent-[var(--ms-plum)]"
            />
            <div className="mt-2 flex gap-2 text-center text-[10px]">
              <div className="flex-1 rounded-[10px] bg-[var(--ms-soft-bg)] py-1.5 text-[var(--ms-mauve)]">Platform 10%</div>
              <div className="flex-1 rounded-[10px] bg-[var(--ms-petal)] py-1.5 font-semibold text-[var(--ms-plum)]">You {salonPct}%</div>
              <div className="flex-1 rounded-[10px] bg-emerald-50 py-1.5 font-semibold text-emerald-700">{member.firstName} {commissionPct}%</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-sm font-semibold text-white transition hover:brightness-110"
          >
            {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Team member dashboard ────────────────────────────────────────────────────

export function TeamMemberDashboard({ session }: { session: TeamMemberProfile }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [newImage, setNewImage] = useState<string | undefined>();
  const [newCaption, setNewCaption] = useState("");
  const [editBio, setEditBio] = useState(session.bio ?? "");
  const [editSpecialty, setEditSpecialty] = useState(session.specialty);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function sync() {
      // Show only posts this team member was credited for
      setPosts(readPosts().filter((p) => p.creditedToMemberId === session.id));
    }
    sync();
    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [session.id]);

  function handlePublishPost() {
    if (!newCaption.trim() && !newImage) return;
    const post: SocialPost = {
      id: `post_${Date.now()}`,
      // Post is attributed to the SALON (ownership rule)
      authorId: session.salonId,
      authorSlug: session.salonSlug,
      authorName: session.salonName,
      authorRole: "salon",
      // Team member gets the credit
      creditedToMemberId: session.id,
      creditedToMemberName: session.firstName,
      ownedBySalonId: session.salonId,
      type: "portfolio",
      images: newImage ? [newImage] : [],
      caption: newCaption,
      tags: [],
      likes: 0,
      savedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    writePost(post);
    setPosts((prev) => [post, ...prev]);
    setNewImage(undefined);
    setNewCaption("");
    setShowUpload(false);
  }

  function handleSaveProfile() {
    const updated: TeamMemberProfile = { ...session, bio: editBio, specialty: editSpecialty };
    writeAppSession(updated);
    setSaved(true);
    setShowEditProfile(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const initials = session.firstName[0].toUpperCase();
  const split = calcEarningsSplit(2000, session.commissionPct);

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Profile header */}
      <div className="rounded-[32px] bg-[linear-gradient(135deg,var(--ms-plum),#7C3A6F)] px-5 py-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/20 text-3xl font-bold">
                {session.profilePhoto ? (
                  <img src={session.profilePhoto} alt={session.firstName} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold">{session.firstName}</h1>
              <p className="mt-0.5 text-sm text-white/75">{session.specialty || "Stylist"}</p>
              <Link
                href={`/salons/${session.salonSlug}`}
                className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/25"
              >
                <Store className="h-3 w-3" /> {session.salonName}
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEditProfile(true)}
            className="rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            title="Edit profile"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {session.bio && (
          <p className="mt-3 text-sm leading-6 text-white/80">{session.bio}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Posts", value: posts.length },
          { label: "Your cut", value: `${session.commissionPct}%` },
          { label: "Est. per KES 2k", value: `KES ${split.member.toLocaleString()}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[20px] border border-[var(--ms-border)] bg-white p-3 text-center shadow-[0_4px_12px_rgba(13,27,42,0.04)]">
            <p className="text-xl font-bold text-[var(--ms-navy)]">{stat.value}</p>
            <p className="text-xs text-[var(--ms-mauve)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Upload to salon portfolio */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="flex w-full items-center gap-3 rounded-[24px] border-2 border-dashed border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-5 py-4 text-left transition hover:border-[var(--ms-plum)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-white">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ms-navy)]">Upload your work</p>
            <p className="text-xs text-[var(--ms-mauve)]">
              Goes to <strong>{session.salonName}</strong> portfolio · You are credited as the artist
            </p>
          </div>
        </button>
      </div>

      {/* Earnings section */}
      <div className="mt-4 rounded-[24px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_4px_12px_rgba(13,27,42,0.04)]">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">How you earn</p>
        <p className="text-sm leading-6 text-[var(--ms-charcoal)]">
          When a client pays for a service at <strong>{session.salonName}</strong>, the payment is held securely until you mark the service complete. You then receive <strong>{session.commissionPct}%</strong> of the net amount directly to your M-Pesa.
        </p>
        <div className="mt-3 flex gap-2 text-center text-[11px]">
          <div className="flex-1 rounded-[12px] bg-[var(--ms-soft-bg)] py-2 text-[var(--ms-mauve)]">
            <p className="font-bold">10%</p>
            <p>Platform</p>
          </div>
          <div className="flex-1 rounded-[12px] bg-[var(--ms-petal)] py-2 text-[var(--ms-plum)]">
            <p className="font-bold">{90 - session.commissionPct}%</p>
            <p>Salon</p>
          </div>
          <div className="flex-1 rounded-[12px] bg-emerald-50 py-2 text-emerald-700">
            <p className="font-bold">{session.commissionPct}%</p>
            <p>You</p>
          </div>
        </div>
      </div>

      {/* Bookings section */}
      <div className="mt-4 rounded-[24px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_4px_12px_rgba(13,27,42,0.04)]">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Bookings</p>
        <div className="flex flex-col items-center py-6 text-center">
          <CalendarDays className="h-8 w-8 text-[var(--ms-mauve)] opacity-40" />
          <p className="mt-3 text-sm font-semibold text-[var(--ms-navy)]">Bookings assigned to you will appear here</p>
          <p className="mt-1 text-xs text-[var(--ms-mauve)]">Your salon admin assigns bookings to team members from their dashboard.</p>
        </div>
      </div>

      {/* My credited posts */}
      {posts.length > 0 && (
        <div className="mt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Your uploaded work</p>
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {posts.map((post) => (
              <div key={post.id} className="group relative aspect-square overflow-hidden rounded-[12px] bg-[var(--ms-soft-bg)]">
                {post.images[0] ? (
                  <img src={post.images[0]} alt={post.caption} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--ms-petal),var(--ms-soft-bg))]">
                    <ImagePlus className="h-6 w-6 text-[var(--ms-mauve)] opacity-40" />
                  </div>
                )}
                {/* "Owned by salon" overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                  <p className="text-[9px] font-semibold text-white/80">
                    {session.salonName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-t-[32px] bg-white p-5 shadow-[0_-18px_60px_rgba(13,27,42,0.18)] sm:rounded-[32px]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--ms-navy)]">Upload work</h2>
                <p className="text-xs text-[var(--ms-mauve)]">
                  Will appear in <strong>{session.salonName}</strong>&apos;s portfolio · Credited to you
                </p>
              </div>
              <button type="button" onClick={() => setShowUpload(false)} className="rounded-full bg-[var(--ms-soft-bg)] p-2">
                <X className="h-4 w-4 text-[var(--ms-mauve)]" />
              </button>
            </div>

            <ImageUploadEditor
              label="Add photo"
              requirements="JPG or PNG · max 5 MB"
              aspectHint="1:1 or portrait works best"
              maxMB={5}
              value={newImage}
              onSave={(url) => setNewImage(url)}
            />

            <textarea
              className="mt-3 w-full resize-none rounded-[16px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm leading-6 outline-none placeholder:text-[var(--ms-mauve)]"
              rows={3}
              placeholder="Describe the look — technique, products used, inspiration…"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
            />

            <button
              type="button"
              onClick={handlePublishPost}
              disabled={!newCaption.trim() && !newImage}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> Add to {session.salonName} portfolio
            </button>
          </div>
        </div>
      )}

      {/* Edit profile modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-t-[32px] bg-white p-5 shadow-[0_-18px_60px_rgba(13,27,42,0.18)] sm:rounded-[32px]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--ms-navy)]">Edit profile</h2>
              <button type="button" onClick={() => setShowEditProfile(false)} className="rounded-full bg-[var(--ms-soft-bg)] p-2">
                <X className="h-4 w-4 text-[var(--ms-mauve)]" />
              </button>
            </div>
            <div className="space-y-3">
              <TeamField icon={<Sparkles className="h-4 w-4" />} label="Specialty" value={editSpecialty} onChange={setEditSpecialty} />
              <div className="rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
                <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
                  Bio
                </span>
                <textarea
                  className="mt-2 w-full resize-none bg-transparent text-sm leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-border)]"
                  rows={3}
                  placeholder="Short bio about your style and experience…"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-sm font-semibold text-white transition hover:brightness-110"
            >
              {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared form field ────────────────────────────────────────────────────────

function TeamField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
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
