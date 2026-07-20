"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Crown,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { useState } from "react";

import {
  createSessionForRole,
  readAppSession,
  writeAppSession,
  type AppUserRole,
} from "@/lib/client-session";
import { parsePhoneNumber } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";

// ─── Role definitions ────────────────────────────────────────────────────────

const ROLES = [
  {
    key: "client" as const,
    label: "Client",
    tagline: "Book a beauty service",
    description:
      "Find salons and professionals near you, see real prices, and confirm a booking in minutes.",
    badge: "Most users start here",
    icon: Sparkles,
    color: "#C8284A",
    colorLight: "rgba(200,40,74,0.10)",
    colorBorder: "rgba(200,40,74,0.32)",
    signUpHref: "/signup/client",
    signInDest: "/home",
    showInSignIn: true,
  },
  {
    key: "salon" as const,
    label: "Salon",
    tagline: "List your salon",
    description:
      "Showcase your team, services, and portfolio. Accept bookings and manage your business page.",
    badge: "Business account",
    icon: Building2,
    color: "#BF8C2E",
    colorLight: "rgba(191,140,46,0.10)",
    colorBorder: "rgba(191,140,46,0.32)",
    signUpHref: "/profile",
    signInDest: "/home",
    showInSignIn: true,
  },
  {
    key: "professional" as const,
    label: "Professional",
    tagline: "Offer your skills",
    description:
      "Build a bookable profile with your portfolio, pricing, and availability. No rent barrier.",
    badge: "Independent pro",
    icon: Crown,
    color: "#1A7A6B",
    colorLight: "rgba(26,122,107,0.10)",
    colorBorder: "rgba(26,122,107,0.32)",
    signUpHref: "/profile",
    signInDest: "/home",
    showInSignIn: true,
  },
  {
    key: "shop" as const,
    label: "Shop",
    tagline: "Sell beauty products",
    description:
      "List and sell genuine beauty products on Counter. Escrow-protected. 5% commission only when you sell.",
    badge: "Seller account",
    icon: ShoppingBag,
    color: "#8B5CF6",
    colorLight: "rgba(139,92,246,0.10)",
    colorBorder: "rgba(139,92,246,0.32)",
    signUpHref: "/shop/profile",
    signInDest: "/shop/dashboard",
    showInSignIn: false,
  },
  {
    key: "delivery" as const,
    label: "Delivery",
    tagline: "Deliver for shops",
    description:
      "Partner with Shop+ sellers as an independent delivery rider. Earn per delivery across Nairobi.",
    badge: "Rider account",
    icon: Truck,
    color: "#EA580C",
    colorLight: "rgba(234,88,12,0.10)",
    colorBorder: "rgba(234,88,12,0.32)",
    signUpHref: "/delivery/profile",
    signInDest: "/delivery/dashboard",
    showInSignIn: false,
  },
] as const;

type RoleKey = (typeof ROLES)[number]["key"];

// ─── Role-specific community standards (spec §5.4) ───────────────────────────

const COMMUNITY_STANDARDS: Record<RoleKey, string[]> = {
  client: [
    "Book honestly. Only book services you intend to keep.",
    "Respect the professional’s time. Cancel with as much notice as possible.",
    "Pay through the platform. Never pay cash or outside the app.",
    "Leave honest reviews. Your review helps every other woman here.",
    "This is a safe space. Report anything that feels wrong.",
    "Your data is private. We will never share your personal details without your consent.",
  ],
  salon: [
    "Be who you say you are. Your salon name, location, and services must be accurate.",
    "Deliver what you list. Misrepresentation is grounds for removal.",
    "Respond promptly to bookings. Slow response drops your ranking.",
    "All payments go through the platform. Off-platform transactions are prohibited.",
    "Your team is your responsibility. Ensure everyone who works under your account meets our standards.",
    "Keep your information up to date. Outdated services or hours damage client trust.",
  ],
  professional: [
    "Your profile is your business. Make it accurate and keep it current.",
    "Show up on time. Every no-show harms your ranking and your reputation.",
    "Deliver what you promise. Only list services you can actually provide.",
    "All payments go through the platform. No cash, no off-platform transfers.",
    "Respect client privacy. Never share a client’s details with anyone.",
    "Build trust through honesty. A real review is worth more than a fake five stars.",
  ],
  shop: [
    "Sell real products. Counterfeit or mislabelled products result in immediate removal.",
    "Describe accurately. Photos and descriptions must match the real product.",
    "Dispatch on time. Late shipping damages your rating and your clients’ trust.",
    "Honour your prices. Do not change a price after a client has paid.",
    "All payments go through the platform. You will be paid after client confirms receipt.",
    "Report issues to us. If there is a dispute, go through the platform — not directly to the client.",
  ],
  delivery: [
    "Show up for every job you accept. A missed delivery damages everyone — you, the seller, and the client.",
    "Handle products with care. You are responsible for the item from pickup to delivery.",
    "Be on time. Your rating depends on it.",
    "Communicate through the platform. Do not exchange personal contact with clients or sellers.",
    "Your availability status matters. Set it accurately — Available means you will take jobs.",
    "All earnings go through the platform. No side payments.",
  ],
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function AgreementCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--ms-border)] bg-white px-4 py-3 transition hover:border-[var(--ms-rose)]/40">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition",
          checked
            ? "border-[var(--ms-rose)] bg-[var(--ms-rose)] text-white"
            : "border-[var(--ms-border)] bg-white",
        )}
        style={{ minWidth: "1.25rem", minHeight: "1.25rem" }}
      >
        {checked ? (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <input
        checked={checked}
        className="sr-only"
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
      <span className="text-xs leading-5 text-[var(--ms-charcoal)]">{children}</span>
    </label>
  );
}

// ─── Phone step ───────────────────────────────────────────────────────────────

function PhoneStep({
  color,
  onBack,
  onSend,
}: {
  color: string;
  onBack: () => void;
  onSend: (phone: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const clean = phone.replace(/\D/g, "");
  const valid = clean.length >= 9; // Kenyan numbers: at least 9 digits

  async function handleSendClick() {
    if (!valid || sending) return;
    setSending(true);
    setSendError("");

    try {
      onSend(phone); // notify parent — directly sign in / proceed
      setSending(false);
    } catch (err: any) {
      setSendError(err?.message || "Could not proceed. Try again.");
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Card */}
      <div
        className="rounded-[24px] border p-5"
        style={{ backgroundColor: `${color}10`, borderColor: `${color}40` }}
      >
        {/* Icon + heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: color }}
          >
            <Phone className="h-6 w-6 text-white" />
          </span>
          <p className="text-xl font-semibold" style={{ color }}>
            Enter your number
          </p>
          <p className="max-w-xs text-sm leading-6 text-[var(--ms-charcoal)]">
            Enter your phone number below to sign in or create your account instantly.
          </p>
        </div>

        {/* Phone input */}
        <div className="mt-5">
          <div className="flex overflow-hidden rounded-[14px] border-2 bg-white transition focus-within:border-current"
            style={{ borderColor: `${color}60` }}
          >
            <span className="flex items-center border-r px-4 text-sm font-semibold text-[var(--ms-charcoal)]"
              style={{ borderColor: `${color}30` }}
            >
              🇰🇪 +254
            </span>
            <input
              type="tel"
              placeholder="7XX XXX XXX"
              value={phone}
              onChange={(e) => {
                // Normalise: strip country code / leading zero, keep local digits only
                const parsed = parsePhoneNumber(e.target.value);
                setPhone(parsed.localNumber.slice(0, parsed.country.digits));
                setSendError("");
              }}
              className="flex-1 bg-transparent px-4 py-3.5 text-sm text-[var(--ms-navy)] outline-none placeholder:text-[var(--ms-mauve)]/50"
              autoComplete="tel"
            />
          </div>
        </div>

        {/* Error */}
        {sendError && (
          <p className="mt-3 text-center text-xs font-medium text-red-500">{sendError}</p>
        )}

        {/* Continue */}
        <button
          type="button"
          disabled={!valid || sending}
          onClick={() => void handleSendClick()}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: color }}
        >
          {sending ? "Continuing…" : "Continue"}
          {!sending && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-center text-xs text-[var(--ms-mauve)]">
        Protected by secure end-to-end encryption.
      </p>
    </div>
  );
}

// ─── Sign-in picker ────────────────────────────────────────────────────────────
// Shop and Delivery are separate logins — NEVER appear in the account switcher.

const SIGN_IN_ROLES = ROLES.filter((r) => r.showInSignIn);
type SignInRoleKey = "client" | "salon" | "professional";
type SignInStep = "role" | "phone";

export function SignInRolePicker({
  returnTo,
  onSuccess,
}: {
  returnTo: string;
  /** Optional override: called instead of router.push after successful auth. */
  onSuccess?: (destination: string) => void;
}) {
  const router = useRouter();
  const [active, setActive] = useState<SignInRoleKey>("client");
  const [step, setStep] = useState<SignInStep>("role");
  const [phone, setPhone] = useState("");

  const role = SIGN_IN_ROLES.find((r) => r.key === active) ?? SIGN_IN_ROLES[0];
  const dest = role.key === "client" ? returnTo : role.signInDest;

  function handleRoleChange(key: SignInRoleKey) {
    setActive(key);
    setStep("role");
    setPhone("");
  }

  // Phone number submitted — sign the user in directly, no verification step.
  function handleSend(p: string) {
    setPhone(p);
    void handleVerified(p);
  }

  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState("");

  async function handleVerified(overridePhone?: string) {
    setSigningIn(true);
    setSignInError("");
    const targetPhone = overridePhone || phone;
    const fullPhone = `+254${targetPhone.replace(/\D/g, "")}`;
    try {
      const res = await fetch("/api/auth/phone-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, role: role.key }),
      });
      const data = await res.json() as { ok: boolean; user?: { id: string; firstName: string; role: string; phone: string }; error?: string; details?: string };
      if (!data.ok || !data.user) {
        const isDev = process.env.NODE_ENV !== "production";
        const detailedMsg = isDev && data.details 
          ? `Sign-in failed: ${data.error} (Details: ${data.details})` 
          : (data.error ?? "Sign-in failed. Please try again.");
        setSignInError(detailedMsg);
        setSigningIn(false);
        return;
      }

      const existing = readAppSession();
      if (existing?.role === role.key) {
        writeAppSession({ ...existing, id: data.user.id, phone: data.user.phone });
      } else {
        writeAppSession(createSessionForRole(role.key as Exclude<AppUserRole, "guest">, fullPhone));
      }
      if (onSuccess) { onSuccess(dest); } else { router.push(dest); }
    } catch (e: any) {
      const isDev = process.env.NODE_ENV !== "production";
      setSignInError(isDev ? `Network error: ${String(e)}` : "Network error. Please check your connection.");
      setSigningIn(false);
    }
  }

  return (
    <>
      {signInError && <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">{signInError}</div>}
      {signingIn && <div className="rounded-[14px] bg-[var(--ms-soft-bg)] px-4 py-3 text-center text-xs text-[var(--ms-mauve)]">Signing you in…</div>}

      {signingIn ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center border-2 border-dashed rounded-[24px]" style={{ borderColor: `${role.color}40`, backgroundColor: `${role.color}08` }}>
          <svg className="animate-spin h-8 w-8" style={{ color: role.color }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: role.color }}>Signing you in…</p>
        </div>
      ) : step === "phone" ? (
        <PhoneStep
          color={role.color}
          onBack={() => setStep("role")}
          onSend={handleSend}
        />
      ) : (
        <div className="space-y-5">
          {/* Tab pills */}
          <div className="flex gap-2 rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-1.5">
            {SIGN_IN_ROLES.map((r) => {
              const Icon = r.icon;
              const isActive = r.key === active;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRoleChange(r.key as SignInRoleKey)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition-all"
                  style={
                    isActive
                      ? { backgroundColor: r.color, color: "#fff", boxShadow: `0 6px 20px ${r.color}44` }
                      : { color: "var(--ms-mauve)" }
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active role card */}
          <div
            className="rounded-[24px] border p-5 transition-all"
            style={{ backgroundColor: role.colorLight, borderColor: role.colorBorder }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ backgroundColor: role.color, color: "#fff" }}
                >
                  {role.badge}
                </span>
                <p className="mt-3 text-2xl font-semibold" style={{ color: role.color }}>
                  {role.tagline}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--ms-charcoal)]">
                  {role.description}
                </p>
              </div>
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: role.color }}
              >
                <role.icon className="h-5 w-5" />
              </span>
            </div>

            {/* CTA → goes to phone step */}
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] text-sm font-semibold text-white transition hover:brightness-110"
              style={{ backgroundColor: role.color }}
            >
              Sign in as {role.label}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Helper hint */}
          <p className="rounded-[16px] bg-[var(--ms-soft-bg)] px-4 py-3 text-center text-xs leading-5 text-[var(--ms-mauve)]">
            Not sure?{" "}
            <button
              type="button"
              onClick={() => handleRoleChange("client")}
              className="font-semibold"
              style={{ color: SIGN_IN_ROLES[0].color }}
            >
              Start as Client
            </button>{" "}
            — you can always book without a pro account.
          </p>
        </div>
      )}
    </>
  );
}

// ─── Sign-up picker ───────────────────────────────────────────────────────────

type SignUpStep = "role" | "phone" | "name";

export function SignUpRolePicker({
  onSuccess,
}: {
  /** Optional override: called instead of router.push after successful auth. */
  onSuccess?: (destination: string) => void;
} = {}) {
  const router = useRouter();
  const [active, setActive] = useState<RoleKey>("client");
  const [agreedCommunity, setAgreedCommunity] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [step, setStep] = useState<SignUpStep>("role");
  const [phone, setPhone] = useState("");

  const role = ROLES.find((r) => r.key === active)!;
  const canProceed = agreedCommunity && agreedTerms;

  function handleRoleChange(key: RoleKey) {
    setActive(key);
    setAgreedCommunity(false);
    setAgreedTerms(false);
    setStep("role");
    setPhone("");
  }

  // Phone number submitted — proceed directly, no verification step.
  function handleSend(p: string) {
    setPhone(p);
    handleVerified(p);
  }

  const [signingUp, setSigningUp] = useState(false);
  const [signUpError, setSignUpError] = useState("");
  const [displayName, setDisplayName] = useState("");

  function handleVerified(overridePhone?: string) {
    const targetPhone = overridePhone || phone;
    const cleanP = targetPhone.replace(/\D/g, "");
    // Non-client roles: collect a name first, then create the DB user
    if (role.key !== "client") {
      setStep("name");
      return;
    }
    // Client: defer to ClientSignupFlow
    const fullPhone = `+254${cleanP}`;
    const existing = readAppSession();
    if (!existing || existing.role !== role.key) {
      writeAppSession(createSessionForRole(role.key as Exclude<AppUserRole, "guest">, fullPhone));
    }
    if (onSuccess) { onSuccess(role.signUpHref); } else { router.push(role.signUpHref); }
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;
    const fullPhone = `+254${phone.replace(/\D/g, "")}`;
    setSigningUp(true);
    setSignUpError("");
    try {
      const res = await fetch("/api/auth/phone-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, role: role.key, firstName: name }),
      });
      const data = await res.json() as { ok: boolean; error?: string; details?: string };
      if (!data.ok) {
        const isDev = process.env.NODE_ENV !== "production";
        const detailedMsg = isDev && data.details 
          ? `Could not create account: ${data.error} (Details: ${data.details})` 
          : (data.error ?? "Could not create account. Try again.");
        setSignUpError(detailedMsg);
        setSigningUp(false);
        return;
      }
    } catch (err: any) {
      const isDev = process.env.NODE_ENV !== "production";
      setSignUpError(isDev ? `Network error: ${String(err)}` : "Network error. Please try again.");
      setSigningUp(false);
      return;
    }
    const existing = readAppSession();
    if (!existing || existing.role !== role.key) {
      writeAppSession(createSessionForRole(role.key as Exclude<AppUserRole, "guest">, fullPhone));
    }
    if (onSuccess) { onSuccess(role.signUpHref); } else { router.push(role.signUpHref); }
  }

  return (
    <>
      {signUpError && <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">{signUpError}</div>}
      {signingUp && <div className="rounded-[14px] bg-[var(--ms-soft-bg)] px-4 py-3 text-center text-xs text-[var(--ms-mauve)]">Creating your account…</div>}

      {signingUp ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center border-2 border-dashed rounded-[24px]" style={{ borderColor: `${role.color}40`, backgroundColor: `${role.color}08` }}>
          <svg className="animate-spin h-8 w-8" style={{ color: role.color }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: role.color }}>Creating your account…</p>
        </div>
      ) : step === "phone" ? (
        <PhoneStep
          color={role.color}
          onBack={() => setStep("role")}
          onSend={handleSend}
        />
      ) : step === "name" ? (
        <form onSubmit={(e) => void handleNameSubmit(e)} className="space-y-4">
          <button type="button" onClick={() => setStep("phone")} className="flex items-center gap-1.5 text-xs text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="rounded-[24px] border p-5" style={{ backgroundColor: role.colorLight, borderColor: role.colorBorder }}>
            <p className="text-sm font-semibold" style={{ color: role.color }}>What should we call you?</p>
            <p className="mt-1 text-xs text-[var(--ms-mauve)]">This name appears on your {role.label} profile.</p>
            <label className="mt-4 block rounded-[20px] border border-[var(--ms-border)] bg-white px-4 py-3.5 transition focus-within:border-[var(--ms-rose)]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ms-mauve)]">
                {role.key === "salon" ? "Salon name" : "Your name"}
              </span>
              <input
                autoFocus
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder={role.key === "salon" ? "e.g. Glam Studio" : "e.g. Amina Odhiambo"}
                className="mt-1.5 block w-full bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]/50"
              />
            </label>
          </div>
          {signUpError && <p className="rounded-[14px] bg-red-50 px-4 py-3 text-xs font-medium text-red-600">{signUpError}</p>}
          <button
            type="submit"
            disabled={signingUp || !displayName.trim()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: role.color }}
          >
            {signingUp ? "Creating account…" : `Continue as ${role.label}`}
            {!signingUp && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      ) : (
    <div className="space-y-5">
      {/* Role grid — 5 items, compact, always shows labels */}
      <div className="grid grid-cols-5 gap-1 rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-1">
        {ROLES.map((r) => {
          const Icon = r.icon;
          const isActive = r.key === active;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => handleRoleChange(r.key)}
              className="flex flex-col items-center justify-center gap-1 rounded-[14px] px-1 py-2.5 font-semibold transition-all"
              style={
                isActive
                  ? { backgroundColor: r.color, color: "#fff", boxShadow: `0 4px 14px ${r.color}44` }
                  : { color: "var(--ms-mauve)" }
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-[10px] leading-none">{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active role card */}
      <div
        className="rounded-[24px] border p-5 transition-all"
        style={{ backgroundColor: role.colorLight, borderColor: role.colorBorder }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span
              className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ backgroundColor: role.color, color: "#fff" }}
            >
              {role.badge}
            </span>
            <p className="mt-3 text-2xl font-semibold" style={{ color: role.color }}>
              {role.tagline}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--ms-charcoal)]">
              {role.description}
            </p>
          </div>
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: role.color }}
          >
            <role.icon className="h-5 w-5" />
          </span>
        </div>

        {/* Community Standards */}
        <div className="mt-5 rounded-[18px] border border-[var(--ms-border)] bg-white p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ms-rose)]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ms-navy)]">
                Our Community Standards
              </p>
              <p className="mt-1 text-xs text-[var(--ms-mauve)]">
                This platform is built for women who take care of themselves. We hold every member to these standards.
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {COMMUNITY_STANDARDS[active].map((standard, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-5 text-[var(--ms-charcoal)]">
                <span className="mt-0.5 shrink-0 text-[var(--ms-rose)]">✦</span>
                {standard}
              </li>
            ))}
          </ul>
        </div>

        {/* Agreement checkboxes */}
        <div className="mt-4 space-y-3">
          <AgreementCheckbox checked={agreedCommunity} onChange={setAgreedCommunity}>
            I agree to the{" "}
            <span className="font-semibold text-[var(--ms-navy)]">Community Standards</span>{" "}
            above and commit to this community.
          </AgreementCheckbox>

          <AgreementCheckbox checked={agreedTerms} onChange={setAgreedTerms}>
            I have read and agree to Mobile Salon&rsquo;s{" "}
            <Link
              href="/terms"
              className="font-semibold text-[var(--ms-rose)] underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              Terms &amp; Conditions
            </Link>
            . I am 18 years of age or older.
          </AgreementCheckbox>
        </div>

        {/* CTA — goes to phone verification after agreements */}
        {canProceed ? (
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] text-sm font-semibold text-white transition hover:brightness-110"
            style={{ backgroundColor: role.color }}
          >
            Continue as {role.label}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            disabled
            className="mt-5 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[16px] text-sm font-semibold text-white opacity-40"
            style={{ backgroundColor: role.color }}
            type="button"
          >
            Continue as {role.label}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {!canProceed && (
          <p className="mt-2 text-center text-xs text-[var(--ms-mauve)]">
            Please agree to the Community Standards and Terms to continue.
          </p>
        )}
      </div>

      {/* Shortcut links for other roles */}
      <p className="text-center text-xs text-[var(--ms-mauve)]">
        {ROLES.filter((r) => r.key !== active).map((r, i) => (
          <span key={r.key}>
            {i > 0 && <span className="mx-1.5 opacity-40">·</span>}
            <button
              type="button"
              onClick={() => handleRoleChange(r.key)}
              className="font-semibold underline-offset-2 hover:underline"
              style={{ color: r.color }}
            >
              {r.label}
            </button>
          </span>
        ))}
        <span className="ml-1">accounts also available</span>
      </p>
    </div>
      )}
    </>
  );
}
