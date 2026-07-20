"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronRight,
  Sparkles,
  Store,
  UserRound,
  X,
} from "lucide-react";

import { ImageUploadEditor } from "@/components/image-upload-editor";
import {
  createTeamMemberSession,
  writeAppSession,
} from "@/lib/client-session";
import {
  acceptInvite,
  calcEarningsSplit,
  getTeamMemberByToken,
  type TeamMember,
} from "@/lib/team-store";
import { cn } from "@/lib/utils";

// ─── Inner content (needs useSearchParams → must be inside Suspense) ──────────

function JoinTeamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [member, setMember] = useState<TeamMember | null | "not_found">(null);
  const [firstName, setFirstName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [step, setStep] = useState<"loading" | "invalid" | "already_used" | "welcome" | "done">("loading");

  useEffect(() => {
    if (!token) {
      setStep("invalid");
      return;
    }
    const found = getTeamMemberByToken(token);
    if (!found) {
      setStep("invalid");
      setMember("not_found");
      return;
    }
    if (found.inviteStatus === "accepted") {
      setStep("already_used");
      setMember(found);
      return;
    }
    setMember(found);
    setFirstName(found.firstName);
    setStep("welcome");
  }, [token]);

  function handleAccept() {
    if (!member || member === "not_found") return;
    const profile = createTeamMemberSession({
      firstName: firstName.trim() || member.firstName,
      phone: member.phone,
      specialty: member.specialty,
      salonId: member.salonId,
      salonName: member.salonName,
      salonSlug: member.salonSlug,
      commissionPct: member.commissionPct,
      profilePhoto: photo,
      bio: bio.trim() || undefined,
    });
    acceptInvite(token, profile.id);
    writeAppSession(profile);
    setStep("done");
    setTimeout(() => router.push("/profile"), 1800);
  }

  // ── Loading ──
  if (step === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="loader-bloom h-12 w-12" />
      </div>
    );
  }

  // ── Invalid token ──
  if (step === "invalid") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-red-50">
          <X className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[var(--ms-navy)]">Invalid invite link</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">
          This invite link is invalid or has expired. Ask your salon admin to generate a new one.
        </p>
        <Link
          href="/home"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ms-petal)] px-6 py-3 text-sm font-semibold text-[var(--ms-rose)] hover:opacity-90"
        >
          Go to Mobile Salon
        </Link>
      </div>
    );
  }

  // ── Already used ──
  if (step === "already_used" && member && member !== "not_found") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-50">
          <BadgeCheck className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[var(--ms-navy)]">Already joined</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">
          This invite was already accepted. You&apos;re part of <strong>{member.salonName}</strong>.
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ms-plum)] px-6 py-3 text-sm font-semibold text-white hover:brightness-110"
        >
          Go to my dashboard <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // ── Done ──
  if (step === "done" && member && member !== "not_found") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-50">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[var(--ms-navy)]">You&apos;re in!</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">
          Welcome to <strong>{member.salonName}</strong>. Taking you to your dashboard…
        </p>
      </div>
    );
  }

  // ── Welcome / setup form ──
  if (step === "welcome" && member && member !== "not_found") {
    const split = calcEarningsSplit(2000, member.commissionPct);

    return (
      <div className="mx-auto max-w-md pb-24">
        {/* Hero banner */}
        <div className="rounded-[32px] bg-[linear-gradient(135deg,var(--ms-plum),#7C3A6F)] px-6 py-8 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
            You&apos;ve been invited
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-snug">
            Join {member.salonName} on Mobile Salon
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
              {member.firstName[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{member.firstName}</p>
              <p className="text-sm text-white/70">{member.specialty}</p>
            </div>
          </div>
        </div>

        {/* Earnings preview */}
        <div className="mt-4 rounded-[24px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_4px_12px_rgba(13,27,42,0.05)]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
            Your earnings split
          </p>
          <div className="flex gap-2 text-center text-[11px]">
            <div className="flex-1 rounded-[12px] bg-[var(--ms-soft-bg)] py-2.5 text-[var(--ms-mauve)]">
              <p className="text-sm font-bold">10%</p>
              <p>Platform</p>
            </div>
            <div className="flex-1 rounded-[12px] bg-[var(--ms-petal)] py-2.5 text-[var(--ms-plum)]">
              <p className="text-sm font-bold">{90 - member.commissionPct}%</p>
              <p>Salon</p>
            </div>
            <div className="flex-1 rounded-[12px] bg-emerald-50 py-2.5 text-emerald-700">
              <p className="text-sm font-bold">{member.commissionPct}%</p>
              <p>You</p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--ms-mauve)]">
            On a KES 2,000 booking you earn{" "}
            <strong className="text-emerald-700">KES {split.member.toLocaleString()}</strong> to your M-Pesa
          </p>
        </div>

        {/* Setup form */}
        <div className="mt-4 space-y-4">
          <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_4px_16px_rgba(13,27,42,0.05)]">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
              Set up your profile
            </p>

            {/* Profile photo */}
            <div className="mb-4">
              <ImageUploadEditor
                label="Profile photo (optional)"
                requirements="JPG or PNG · max 5 MB · square works best"
                aspectHint="1:1"
                maxMB={5}
                value={photo}
                onSave={(url) => setPhoto(url)}
              />
            </div>

            {/* Name */}
            <label className="block rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
                <UserRound className="h-3.5 w-3.5" /> First name
              </span>
              <input
                type="text"
                className="mt-2 w-full bg-transparent text-sm font-semibold text-[var(--ms-navy)] outline-none"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your name"
              />
            </label>

            {/* Specialty (read-only display) */}
            <div className="mt-3 flex items-center gap-2 rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--ms-plum)]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Specialty</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ms-navy)]">{member.specialty}</p>
              </div>
              <p className="ml-auto text-[10px] text-[var(--ms-mauve)]">Set by salon</p>
            </div>

            {/* Salon (read-only) */}
            <div className="mt-3 flex items-center gap-2 rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
              <Store className="h-4 w-4 shrink-0 text-[var(--ms-plum)]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Your salon</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ms-navy)]">{member.salonName}</p>
              </div>
            </div>

            {/* Bio */}
            <label className="mt-3 block rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
                Short bio (optional)
              </span>
              <textarea
                className="mt-2 w-full resize-none bg-transparent text-sm leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-border)]"
                rows={2}
                placeholder="Describe your style and experience in a sentence…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </label>
          </div>

          {/* What you agree to */}
          <div className="rounded-[20px] bg-[var(--ms-soft-bg)] px-4 py-4 text-[11px] leading-5 text-[var(--ms-mauve)]">
            <p className="font-semibold text-[var(--ms-navy)]">What this means</p>
            <ul className="mt-2 space-y-1.5 list-disc list-inside">
              <li>Photos you upload go to <strong>{member.salonName}</strong>&apos;s portfolio. You are credited as the artist.</li>
              <li>Clients book through the salon. You receive <strong>{member.commissionPct}%</strong> of each completed service.</li>
              <li>Payment is released to your M-Pesa after you mark a service complete.</li>
              <li>You can leave the salon at any time. Your uploaded photos stay with the salon.</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            disabled={!firstName.trim()}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-base font-bold text-white shadow-[0_6px_24px_rgba(132,36,92,0.25)] transition hover:brightness-110 disabled:opacity-40"
          >
            <BadgeCheck className="h-5 w-5" />
            Accept &amp; join {member.salonName}
          </button>

          <p className="text-center text-[11px] text-[var(--ms-mauve)]">
            By joining you agree to Mobile Salon&apos;s{" "}
            <Link href="/terms" className="underline">Terms of Service</Link>.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function JoinTeamPage() {
  return (
    <div className="min-h-screen bg-[var(--ms-soft-bg)]">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Logo / brand header */}
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-[var(--ms-navy)]">Mobile Salon</span>
        </div>
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="loader-bloom h-12 w-12" />
            </div>
          }
        >
          <JoinTeamContent />
        </Suspense>
      </div>
    </div>
  );
}
