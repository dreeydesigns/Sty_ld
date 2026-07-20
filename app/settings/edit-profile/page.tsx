"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Check, Image, Phone, User } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ImageUploadEditor } from "@/components/image-upload-editor";
import {
  readAppSession,
  writeAppSession,
  APP_SESSION_EVENT,
  type AppUserSession,
} from "@/lib/client-session";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(session: AppUserSession): string {
  if (session.role === "client")       return (session as { firstName: string }).firstName;
  if (session.role === "professional") return (session as { displayName: string }).displayName;
  if (session.role === "salon")        return (session as { salonName: string }).salonName;
  if (session.role === "team_member")  return (session as { firstName: string }).firstName;
  return "";
}

function getBio(session: AppUserSession): string {
  return (session as { bio?: string }).bio ?? "";
}

function getPhone(session: AppUserSession): string {
  return (session as { phone?: string }).phone ?? "";
}

function getPhoto(session: AppUserSession): string | undefined {
  return (session as { profilePhoto?: string }).profilePhoto;
}

function getCoverPhoto(session: AppUserSession): string | undefined {
  return (session as { coverPhoto?: string }).coverPhoto;
}

function isSalonNameLocked(session: AppUserSession): { locked: boolean; daysRemaining: number } {
  if (session.role !== "salon") return { locked: false, daysRemaining: 0 };
  const raw = (session as { salonNameLastChanged?: string }).salonNameLastChanged;
  if (!raw) return { locked: false, daysRemaining: 0 };
  const changed = new Date(raw);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince < 90) return { locked: true, daysRemaining: 90 - daysSince };
  return { locked: false, daysRemaining: 0 };
}

function bioLimit(session: AppUserSession): number {
  return session.role === "professional" ? 140 : 160;
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder = "",
  hint,
}: {
  label: string;
  icon: React.ElementType<{ className?: string; strokeWidth?: number }>;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label
      className={`block rounded-[20px] border border-[var(--ms-border)] px-4 py-3 transition ${
        disabled
          ? "bg-[var(--ms-soft-bg)] opacity-70"
          : "bg-[var(--ms-soft-bg)] focus-within:border-[var(--ms-plum)]"
      }`}
    >
      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </span>
      <input
        type={type}
        disabled={disabled}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent text-sm font-semibold text-[var(--ms-navy)] outline-none placeholder:text-[var(--ms-border)] disabled:cursor-not-allowed"
      />
      {hint && <p className="mt-1.5 text-[11px] leading-4 text-amber-700">{hint}</p>}
    </label>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const [session,  setSession]  = useState<AppUserSession | null>(null);
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [bio,      setBio]      = useState("");
  const [photo,    setPhoto]    = useState<string | undefined>();
  const [cover,    setCover]    = useState<string | undefined>();
  const [saved,    setSaved]    = useState(false);
  const [loading,  setLoading]  = useState(false);

  // ── Initial values for dirty tracking ──
  const [initName,  setInitName]  = useState("");
  const [initPhone, setInitPhone] = useState("");
  const [initBio,   setInitBio]   = useState("");
  const [initPhoto, setInitPhoto] = useState<string | undefined>();
  const [initCover, setInitCover] = useState<string | undefined>();

  useEffect(() => {
    function sync() {
      const s = readAppSession();
      setSession(s);
      if (s && s.role !== "guest") {
        const n = getDisplayName(s);
        const p = getPhone(s);
        const b = getBio(s);
        const ph = getPhoto(s);
        const cv = getCoverPhoto(s);
        setName(n);   setInitName(n);
        setPhone(p);  setInitPhone(p);
        setBio(b);    setInitBio(b);
        setPhoto(ph); setInitPhoto(ph);
        setCover(cv); setInitCover(cv);
      }
    }
    sync();
    window.addEventListener(APP_SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(APP_SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!session || session.role === "guest") {
    return (
      <AppShell currentNav="profile" showBottomNav>
        <div className="py-16 text-center text-[var(--ms-mauve)]">
          <p className="text-sm">Sign in to edit your profile.</p>
          <Link
            href="/auth/sign-in"
            className="mt-4 inline-block rounded-full bg-[var(--ms-plum)] px-6 py-2.5 text-sm font-bold text-white"
          >
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  const { locked: nameLocked, daysRemaining } = isSalonNameLocked(session);
  const nameLabel =
    session.role === "salon"
      ? "Salon name"
      : session.role === "professional"
      ? "Display name"
      : "First name";

  const limit = bioLimit(session);
  const bioNearLimit = bio.length >= limit - 10;
  const showCoverPhoto = session.role === "salon" || session.role === "professional";

  const isDirty =
    name  !== initName  ||
    phone !== initPhone ||
    bio   !== initBio   ||
    photo !== initPhoto ||
    cover !== initCover;

  function handleSave() {
    if (!session || session.role === "guest" || !isDirty) return;
    setLoading(true);

    const updates: Record<string, unknown> = {};
    if (session.role === "client" || session.role === "team_member") {
      updates.firstName = name.trim() || getDisplayName(session);
    }
    if (session.role === "professional") {
      updates.displayName = name.trim() || getDisplayName(session);
    }
    if (session.role === "salon" && !nameLocked) {
      updates.salonName = name.trim() || getDisplayName(session);
      if (name.trim() !== initName) {
        updates.salonNameLastChanged = new Date().toISOString();
      }
    }
    updates.phone = phone.trim() || getPhone(session);
    updates.bio   = bio.trim() || undefined;
    if (photo !== undefined) updates.profilePhoto = photo;
    if (cover !== undefined && showCoverPhoto) updates.coverPhoto = cover;

    const updated = { ...session, ...updates } as AppUserSession;
    setTimeout(() => {
      writeAppSession(updated);
      setInitName(name);
      setInitPhone(phone);
      setInitBio(bio);
      setInitPhoto(photo);
      setInitCover(cover);
      setSaved(true);
      setLoading(false);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  }

  return (
    <AppShell currentNav="profile" showBottomNav>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ms-border)] bg-white text-[var(--ms-mauve)] shadow-sm transition hover:text-[var(--ms-navy)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[20px] font-bold text-[var(--ms-navy)]">Edit profile</h1>
      </div>

      <div className="mx-auto max-w-md space-y-4 pb-24">

        {/* Cover photo — salon & professional only */}
        {showCoverPhoto && (
          <div className="rounded-[24px] bg-white p-5 shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">
              Cover photo
            </p>
            <ImageUploadEditor
              label="Cover photo"
              requirements="JPG or PNG · max 5 MB · wide banner works best"
              aspectHint="3:1"
              maxMB={5}
              value={cover}
              onSave={(url) => setCover(url)}
            />
            {!cover && (
              <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--ms-mauve)]">
                <Image className="h-4 w-4 shrink-0" strokeWidth={1.85} />
                <span>Add a cover photo to personalise your profile</span>
              </div>
            )}
          </div>
        )}

        {/* Profile photo */}
        <div className="rounded-[24px] bg-white p-5 shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">
            Profile photo
          </p>
          <ImageUploadEditor
            label="Profile photo"
            requirements="JPG or PNG · max 5 MB · square works best"
            aspectHint="1:1"
            maxMB={5}
            value={photo}
            onSave={(url) => setPhoto(url)}
          />
          {!photo && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--ms-mauve)]">
              <Camera className="h-4 w-4 shrink-0" strokeWidth={1.85} />
              <span>Upload a photo to stand out</span>
            </div>
          )}
        </div>

        {/* Name + phone + bio */}
        <div className="space-y-3 rounded-[24px] bg-white p-5 shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">
            Basic info
          </p>

          <Field
            label={nameLabel}
            icon={User}
            value={name}
            onChange={nameLocked ? undefined : setName}
            disabled={nameLocked}
            placeholder="Your name"
            hint={
              nameLocked
                ? `Salon name locked for ${daysRemaining} more day${daysRemaining !== 1 ? "s" : ""}`
                : undefined
            }
          />

          <Field
            label="Phone number"
            icon={Phone}
            value={phone}
            onChange={setPhone}
            type="tel"
            placeholder="+254 7XX XXX XXX"
          />

          {/* Bio with char counter */}
          <div>
            <label
              className={cn(
                "block rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 transition focus-within:border-[var(--ms-plum)]",
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
                Bio
              </span>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, limit))}
                maxLength={limit}
                placeholder="A short description about yourself…"
                className="mt-2 w-full resize-none bg-transparent text-sm leading-6 text-[var(--ms-navy)] outline-none placeholder:text-[var(--ms-border)]"
              />
            </label>
            <p
              className={cn(
                "mt-1 text-right text-[11px]",
                bioNearLimit ? "text-red-500 font-semibold" : "text-[var(--ms-mauve)]",
              )}
            >
              {bio.length} / {limit}
            </p>
          </div>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saved || !isDirty}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,var(--ms-plum),var(--ms-orchid))] text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(132,36,92,0.22)] transition hover:brightness-110 disabled:opacity-60"
        >
          {saved ? (
            <>
              <Check className="h-5 w-5" strokeWidth={2.5} />
              Saved
            </>
          ) : loading ? (
            "Saving…"
          ) : (
            "Save changes"
          )}
        </button>
        {!isDirty && !saved && (
          <p className="text-center text-[11px] text-[var(--ms-mauve)]">No changes to save</p>
        )}
      </div>
    </AppShell>
  );
}
