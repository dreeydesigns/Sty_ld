"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  BookOpen,
  Check,
  ChevronRight,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Info,
  Languages,
  LayoutGrid,
  Lock,
  LogOut,
  MessageCircle,
  Monitor,
  Package,
  Palette,
  Phone,
  Repeat2,
  SaveIcon,
  Shield,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trash2,
  Type,
  Upload,
  User,
  UserCog,
  UserX,
  Users,
  Volume2,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/lib/feature-flags";
import {
  readSettings,
  writeSettings,
  setSetting,
  SETTINGS_CHANGE_EVENT,
  type AppSettings,
} from "@/lib/settings-store";
import {
  APP_SESSION_EVENT,
  readAppSession,
  writeAppSession,
  clearAppSession,
  type AppUserSession,
} from "@/lib/client-session";

// ─── Constants ────────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV === "development";
const LANG_KEY = "ms_language_pref";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(session: AppUserSession | null): string {
  if (!session) return "Guest";
  if (session.role === "client")       return (session as { firstName: string }).firstName;
  if (session.role === "professional") return (session as { displayName: string }).displayName;
  if (session.role === "salon")        return (session as { salonName: string }).salonName;
  if (session.role === "team_member")  return (session as { firstName: string }).firstName;
  return "Guest";
}

function getAccountLabel(session: AppUserSession | null): string {
  if (!session || session.role === "guest") return "Not signed in";
  if (session.role === "client")       return "Client account";
  if (session.role === "professional") return "Professional account";
  if (session.role === "salon")        return "Salon account";
  if (session.role === "team_member")  return "Team member account";
  return "";
}

function maskPhone(phone: string): string {
  if (!phone) return "your registered number";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 6) return phone;
  const visible = cleaned.slice(-3);
  const masked = cleaned.slice(0, -3).replace(/\d/g, "X");
  return `+${masked}${visible}`;
}

function calcStorageUsed(): string {
  if (typeof window === "undefined") return "< 1 KB";
  try {
    let bytes = 0;
    for (const key of Object.keys(localStorage)) {
      bytes += (localStorage.getItem(key) ?? "").length * 2;
    }
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } catch {
    return "< 1 KB";
  }
}

// ─── Language config ──────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", label: "English",   nativeLabel: "English",    dir: "ltr" },
  { code: "sw", label: "Kiswahili", nativeLabel: "Kiswahili",  dir: "ltr" },
  { code: "es", label: "Español",   nativeLabel: "Español",    dir: "ltr" },
  { code: "fr", label: "Français",  nativeLabel: "Français",   dir: "ltr" },
  { code: "ar", label: "Arabic",    nativeLabel: "العربية",    dir: "rtl" },
  { code: "hi", label: "Hindi",     nativeLabel: "हिन्दी",     dir: "ltr" },
  { code: "zh", label: "Chinese",   nativeLabel: "中文",       dir: "ltr" },
  { code: "pt", label: "Português", nativeLabel: "Português",  dir: "ltr" },
] as const;

type LangCode = (typeof LANGUAGES)[number]["code"];

interface LangPref {
  code: LangCode;
  label: string;
  dir: string;
}

function readLangPref(): LangPref {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw) return JSON.parse(raw) as LangPref;
  } catch { /* noop */ }
  return { code: "en", label: "English", dir: "ltr" };
}

function saveLangPref(pref: LangPref): void {
  try {
    localStorage.setItem(LANG_KEY, JSON.stringify(pref));
    document.documentElement.lang = pref.code;
    document.documentElement.dir  = pref.dir;
  } catch { /* noop */ }
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  on,
  onChange,
  disabled = false,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const ariaAttrs = {
    role: "switch",
    "aria-label": "Toggle setting",
    "aria-checked": on ? "true" : "false",
  } as const;

  return (
    <button
      type="button"
      {...ariaAttrs}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full border-2 transition-colors duration-200",
        on
          ? "border-[var(--ms-plum)] bg-[var(--ms-plum)]"
          : "border-[var(--ms-border)] bg-[var(--ms-soft-bg)]",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        className={cn(
          "inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200",
          on ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

// ─── Select pill ──────────────────────────────────────────────────────────────

function SelectPill<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold transition",
            o.value === value
              ? "bg-[var(--ms-plum)] text-white"
              : "bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">
        {title}
      </p>
      <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_6px_rgba(13,27,42,0.06)]">
        {children}
      </div>
    </div>
  );
}

// ─── Row variants ─────────────────────────────────────────────────────────────

interface RowBase {
  icon: React.ElementType<{ className?: string; strokeWidth?: number }>;
  label: string;
  sub?: string;
  danger?: boolean;
  iconBg?: string;
  dim?: boolean;
}

interface ToggleRow extends RowBase {
  kind: "toggle";
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

interface LinkRow extends RowBase {
  kind: "link";
  href?: string;
  onClick?: () => void;
  value?: string;
  readOnly?: boolean;
}

interface SelectRow extends RowBase {
  kind: "select";
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

type RowDef = ToggleRow | LinkRow | SelectRow;

function Row({ def, last }: { def: RowDef; last: boolean }) {
  const Icon = def.icon;
  const isReadOnly = def.kind === "link" && def.readOnly;

  const iconBg    = def.iconBg ?? (def.danger ? "bg-red-50" : "bg-[var(--ms-soft-bg)]");
  const iconColor = def.danger ? "text-red-500" : "text-[var(--ms-mauve)]";

  const inner = (
    <div
      className={cn(
        "flex items-center gap-3.5 px-4 py-3.5",
        !last && "border-b border-[var(--ms-border)]/60",
        def.dim && "opacity-50",
      )}
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]", iconBg)}>
        <Icon className={cn("h-[18px] w-[18px]", iconColor)} strokeWidth={1.85} />
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn("text-[14px] font-semibold leading-snug", def.danger ? "text-red-500" : "text-[var(--ms-navy)]")}>
          {def.label}
        </p>
        {def.sub && (
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--ms-mauve)]">{def.sub}</p>
        )}
      </div>

      {def.kind === "toggle" && (
        <Toggle on={def.on} onChange={def.onChange} disabled={def.disabled} />
      )}
      {def.kind === "link" && !isReadOnly && (
        <div className="flex shrink-0 items-center gap-1.5">
          {def.value && (
            <span className="text-[12px] text-[var(--ms-mauve)]">{def.value}</span>
          )}
          <ChevronRight className="h-4 w-4 text-[var(--ms-border)]" />
        </div>
      )}
      {def.kind === "link" && isReadOnly && def.value && (
        <span className="shrink-0 text-[12px] text-[var(--ms-mauve)]">{def.value}</span>
      )}
      {def.kind === "select" && (
        <SelectPill
          value={def.value}
          options={def.options}
          onChange={def.onChange}
        />
      )}
    </div>
  );

  if (def.kind === "link") {
    if (isReadOnly) {
      return <div className="cursor-default pointer-events-none">{inner}</div>;
    }
    if (def.href) {
      return (
        <Link href={def.href} className="block transition hover:bg-[var(--ms-soft-bg)]/50">
          {inner}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={def.onClick}
        className="w-full text-left transition hover:bg-[var(--ms-soft-bg)]/50"
      >
        {inner}
      </button>
    );
  }

  return <div>{inner}</div>;
}

function RowGroup({ rows }: { rows: RowDef[] }) {
  return (
    <>
      {rows.map((def, i) => (
        <Row key={def.label} def={def} last={i === rows.length - 1} />
      ))}
    </>
  );
}

// ─── OTP boxes ────────────────────────────────────────────────────────────────

function OtpBoxes({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = (value + "      ").slice(0, 6).split("");

  function handleChange(i: number, ch: string) {
    const d = ch.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d || " ";
    const newVal = next.join("").trimEnd().slice(0, 6);
    onChange(newVal);
    if (d && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[i]?.trim() && i > 0) {
        refs.current[i - 1]?.focus();
      }
      const next = [...digits];
      next[i] = " ";
      onChange(next.join("").trimEnd());
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  }

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          value={digits[i]?.trim() ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-10 rounded-[12px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] text-center text-lg font-bold text-[var(--ms-navy)] outline-none transition focus:border-[var(--ms-plum)] focus:ring-2 focus:ring-[var(--ms-plum)]/20"
        />
      ))}
    </div>
  );
}

// ─── Dev OTP banner ───────────────────────────────────────────────────────────

function DevOtpBanner({ otp }: { otp: string }) {
  if (!IS_DEV) return null;
  return (
    <div className="rounded-[12px] bg-amber-50 px-4 py-3">
      <p className="text-[11px] leading-5 text-amber-700">
        <strong>Dev mode —</strong> simulated OTP:{" "}
        <span className="font-mono font-bold tracking-widest">{otp}</span>
        <br />
        SMS (Africa&apos;s Talking) is not yet integrated. In production the code will be sent to the user&apos;s phone.
      </p>
    </div>
  );
}

// ─── Phone change sheet ───────────────────────────────────────────────────────

function PhoneChangeSheet({
  currentPhone,
  onSaved,
  onCancel,
}: {
  currentPhone: string;
  onSaved: (newPhone: string) => void;
  onCancel: () => void;
}) {
  const [step,    setStep]    = useState<"number" | "otp">("number");
  const [number,  setNumber]  = useState("");
  const [otp,     setOtp]     = useState("");
  const [devOtp,  setDevOtp]  = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function handleSendCode() {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned.length < 9) {
      setError("Enter a valid Kenyan mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setDevOtp(code);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 700);
  }

  function handleVerify() {
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSaved(`+254${number.replace(/\D/g, "")}`);
    }, 700);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--ms-border)]" />
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#F0EBFF]">
              <Phone className="h-6 w-6 text-[var(--ms-plum)]" strokeWidth={1.85} />
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close dialog"
              className="mt-1 rounded-full p-1 text-[var(--ms-mauve)] hover:bg-[var(--ms-soft-bg)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {step === "number" ? (
            <>
              <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">Change phone number</h2>
              <p className="mt-1 text-[13px] leading-5 text-[var(--ms-mauve)]">
                Current: <span className="font-semibold text-[var(--ms-navy)]">{maskPhone(currentPhone)}</span>
              </p>
              <div className="mt-4">
                <label className="mb-1.5 block text-[12px] font-semibold text-[var(--ms-navy)]">
                  New number
                </label>
                <div className="flex overflow-hidden rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] focus-within:border-[var(--ms-plum)] transition">
                  <span className="flex items-center border-r border-[var(--ms-border)] bg-white px-3 text-[14px] font-semibold text-[var(--ms-navy)] select-none">
                    +254
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={9}
                    value={number}
                    onChange={(e) => { setNumber(e.target.value.replace(/\D/g, "")); setError(""); }}
                    placeholder="7XX XXX XXX"
                    className="flex-1 bg-transparent px-3 py-3 text-[14px] text-[var(--ms-navy)] outline-none placeholder:text-[var(--ms-border)]"
                  />
                </div>
                {error && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  className="flex-1 rounded-full bg-[var(--ms-plum)] py-3 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send code"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">Enter verification code</h2>
              <p className="mt-1 text-[13px] leading-5 text-[var(--ms-mauve)]">
                We sent a 6-digit code to{" "}
                <span className="font-semibold text-[var(--ms-navy)]">+254 {number.slice(0, 3)} XXX XXX</span>
              </p>
              <div className="mt-5 space-y-4">
                {IS_DEV && devOtp && <DevOtpBanner otp={devOtp} />}
                <OtpBoxes value={otp} onChange={setOtp} />
                {error && (
                  <p className="flex items-center gap-1.5 text-[12px] text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep("number"); setOtp(""); setError(""); }}
                  className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading || otp.trim().length !== 6}
                  className="flex-1 rounded-full bg-[var(--ms-plum)] py-3 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify & save"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Language picker modal ────────────────────────────────────────────────────

function LanguageModal({
  currentCode,
  onSave,
  onClose,
}: {
  currentCode: LangCode;
  onSave: (pref: LangPref) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<LangCode>(currentCode);

  function handleSave() {
    const lang = LANGUAGES.find((l) => l.code === selected);
    if (!lang) return;
    const pref: LangPref = { code: lang.code, label: lang.label, dir: lang.dir };
    saveLangPref(pref);
    onSave(pref);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--ms-border)]" />
        <div className="p-6">
          <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">Language</h2>
          <p className="mt-1 text-[13px] text-[var(--ms-mauve)]">
            Choose your preferred display language.
          </p>
          <div className="mt-4 rounded-[12px] bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] leading-5 text-amber-700">
              UI text remains in English while full translations are in progress. Your selection sets the language direction and locale for dates.
            </p>
          </div>
          <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto">
            {LANGUAGES.map((lang) => {
              const active = selected === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelected(lang.code)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[14px] px-4 py-3.5 transition",
                    active
                      ? "bg-[var(--ms-plum)] text-white"
                      : "bg-[var(--ms-soft-bg)] text-[var(--ms-navy)] hover:bg-[var(--ms-petal)]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[14px] font-semibold", !active && "text-[var(--ms-navy)]")}>
                      {lang.nativeLabel}
                    </span>
                    {lang.code !== "en" && (
                      <span className={cn("text-[12px]", active ? "text-white/70" : "text-[var(--ms-mauve)]")}>
                        {lang.label}
                      </span>
                    )}
                    {lang.dir === "rtl" && (
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700")}>
                        RTL
                      </span>
                    )}
                  </div>
                  {active && <Check className="h-4 w-4 text-white" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
            >
              Cancel
            </button>
            <button onClick={handleSave} aria-label="Save changes"><SaveIcon /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Two-factor authentication modal ─────────────────────────────────────────

function TwoFactorModal({
  mode,
  maskedPhone,
  onConfirm,
  onCancel,
}: {
  mode: "enable" | "disable";
  maskedPhone: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [step,    setStep]    = useState<"phone" | "otp" | "password">(
    mode === "enable" ? "phone" : "password",
  );
  const [otp,     setOtp]     = useState("");
  const [devOtp,  setDevOtp]  = useState("");
  const [password, setPassword] = useState("");
  const [error,   setError]   = useState("");
  const [sending, setSending] = useState(false);

  function handleSendCode() {
    setSending(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setDevOtp(code);
    setTimeout(() => {
      setSending(false);
      setStep("otp");
    }, 700);
  }

  function handleConfirm() {
    if (step === "otp") {
      if (otp.trim().length !== 6) { setError("Enter the 6-digit code."); return; }
    }
    if (step === "password") {
      if (!password.trim()) { setError("Please enter your current password."); return; }
    }
    setError("");
    onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--ms-border)]" />
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#E8F5F2]">
              <Shield className="h-6 w-6 text-emerald-700" strokeWidth={1.85} />
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close dialog"
              className="mt-1 rounded-full p-1 text-[var(--ms-mauve)] hover:bg-[var(--ms-soft-bg)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Enable — step 1: confirm phone & send code */}
          {mode === "enable" && step === "phone" && (
            <>
              <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">
                Enable two-factor authentication
              </h2>
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--ms-mauve)]">
                We will send a test code to your registered number to confirm your phone is reachable.
              </p>
              <div className="mt-4 rounded-[14px] bg-[var(--ms-soft-bg)] px-4 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ms-mauve)]">Phone number</p>
                <p className="mt-1 text-[15px] font-bold text-[var(--ms-navy)]">{maskedPhone}</p>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[var(--ms-mauve)]">
                Not your number? Update it in <strong>Account &rarr; Phone number</strong> first.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sending}
                  className="flex-1 rounded-full bg-[var(--ms-plum)] py-3 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send test code"}
                </button>
              </div>
            </>
          )}

          {/* Enable — step 2: enter OTP */}
          {mode === "enable" && step === "otp" && (
            <>
              <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">
                Enter the code
              </h2>
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--ms-mauve)]">
                Enter the 6-digit code we sent to {maskedPhone}.
              </p>
              <div className="mt-5 space-y-4">
                {IS_DEV && devOtp && <DevOtpBanner otp={devOtp} />}
                <OtpBoxes value={otp} onChange={(v) => { setOtp(v); setError(""); }} />
                {error && (
                  <p className="flex items-center gap-1.5 text-[12px] text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                  className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={otp.trim().length !== 6}
                  className="flex-1 rounded-full bg-[var(--ms-plum)] py-3 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  Enable 2FA
                </button>
              </div>
            </>
          )}

          {/* Disable — enter password */}
          {mode === "disable" && step === "password" && (
            <>
              <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">
                Disable two-factor authentication
              </h2>
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--ms-mauve)]">
                Enter your current password to disable 2FA. Your account will be less secure without it.
              </p>
              <div className="mt-4 rounded-[12px] bg-amber-50 px-4 py-3">
                <p className="text-[11px] leading-5 text-amber-700">
                  We recommend keeping 2FA enabled to protect your account and bookings.
                </p>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Current password"
                className="mt-4 w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-[14px] text-[var(--ms-navy)] outline-none focus:border-[var(--ms-plum)] transition"
              />
              {error && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 rounded-full bg-[var(--ms-plum)] py-3 text-[13px] font-bold text-white transition hover:brightness-110"
                >
                  Disable 2FA
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Age verification modal ───────────────────────────────────────────────────

function AgeVerifyModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (dob: string) => void;
  onCancel: () => void;
}) {
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");

  function verify() {
    if (!dob) { setError("Please enter your date of birth."); return; }
    const birth = new Date(dob);
    const today = new Date();
    const age =
      today.getFullYear() -
      birth.getFullYear() -
      (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    if (isNaN(age) || age < 18) {
      setError("You must be 18 or older to view adult products.");
      return;
    }
    setError("");
    onConfirm(dob);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--ms-border)]" />
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--ms-soft-bg)]">
              <ShieldCheck className="h-6 w-6 text-[var(--ms-plum)]" strokeWidth={1.85} />
            </div>
            <button type="button" onClick={onCancel} aria-label="Close dialog" className="mt-1 rounded-full p-1 text-[var(--ms-mauve)] hover:bg-[var(--ms-soft-bg)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">Confirm your age</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-[var(--ms-mauve)]">
            Adult products on Counter are intended for people aged 18 and above only.
          </p>
          <div className="mt-5">
            <label htmlFor="age-confirm-dob" className="mb-1.5 block text-[12px] font-semibold text-[var(--ms-navy)]">
              Date of birth
            </label>
            <input
              id="age-confirm-dob"
              type="date"
              value={dob}
              onChange={(e) => { setDob(e.target.value); setError(""); }}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                .toISOString()
                .split("T")[0]}
              className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-[14px] text-[var(--ms-navy)] outline-none focus:border-[var(--ms-plum)] transition"
            />
            {error && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-red-500">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>
          <div className="mt-2 rounded-[12px] bg-amber-50 px-4 py-3">
            <p className="text-[11px] leading-5 text-amber-700">
              <strong>For adults aged 18+ only.</strong> This preference is stored on this device only.
            </p>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={verify}
              className="flex-1 rounded-full bg-[var(--ms-plum)] py-3 text-[13px] font-bold text-white transition hover:brightness-110"
            >
              Confirm age
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sign-out confirmation ────────────────────────────────────────────────────

function SignOutConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[16px] font-bold text-[var(--ms-navy)]">Sign out?</h3>
        <p className="mt-1.5 text-[13px] text-[var(--ms-mauve)]">
          You can sign back in anytime. Your data stays safe.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-red-600 py-3 text-[13px] font-bold text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Clear cache confirm modal ────────────────────────────────────────────────

function ClearCacheConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--ms-soft-bg)]">
          <Trash2 className="h-6 w-6 text-[var(--ms-mauve)]" strokeWidth={1.85} />
        </div>
        <h3 className="text-[16px] font-bold text-[var(--ms-navy)]">Clear cached data?</h3>
        <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
          This removes temporary files — draft previews, image cache, and non-essential app data. Your account, posts, bookings, and messages are not affected.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-[var(--ms-navy)] py-3 text-[13px] font-bold text-white transition hover:brightness-125"
          >
            Clear cache
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Download data confirm modal ──────────────────────────────────────────────

function DownloadDataConfirmModal({
  maskedPhone,
  onConfirm,
  onCancel,
}: {
  maskedPhone: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#EDF5FF]">
          <Download className="h-6 w-6 text-[var(--ms-plum)]" strokeWidth={1.85} />
        </div>
        <h3 className="text-[16px] font-bold text-[var(--ms-navy)]">Download your data</h3>
        <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
          We will prepare a copy of your posts, bookings, messages, and account information and send a download link to your registered phone number.
        </p>
        <div className="mt-3 rounded-[14px] bg-[var(--ms-soft-bg)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ms-mauve)]">Will be sent to</p>
          <p className="mt-0.5 text-[14px] font-bold text-[var(--ms-navy)]">{maskedPhone}</p>
        </div>
        <p className="mt-2 text-[11px] text-[var(--ms-mauve)]">
          Your file will be ready within 48 hours. This is a simulated request — Vercel Cron Jobs are not yet configured.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-[var(--ms-plum)] py-3 text-[13px] font-bold text-white transition hover:brightness-110"
          >
            Request download
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Report a problem modal ───────────────────────────────────────────────────

function ReportProblemModal({ onClose }: { onClose: () => void }) {
  const [category,    setCategory]    = useState("");
  const [description, setDescription] = useState("");
  const [screenshot,  setScreenshot]  = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  const MIN_CHARS = 20;
  const MAX_CHARS = 500;
  const tooShort  = description.trim().length < MIN_CHARS;
  const atLimit   = description.length >= MAX_CHARS - 10;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!category || tooShort) return;
    try {
      const existing = JSON.parse(localStorage.getItem("ms_support_reports") ?? "[]") as unknown[];
      existing.push({
        id: `rep_${Date.now()}`,
        category,
        description: description.trim(),
        screenshotAttached: !!screenshot,
        submittedAt: new Date().toISOString(),
      });
      localStorage.setItem("ms_support_reports", JSON.stringify(existing));
    } catch { /* noop */ }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--ms-border)]" />
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-7 w-7 text-emerald-600" strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">Report received</h2>
            <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
              Thank you for letting us know. Our team will review your report and follow up if needed.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-[var(--ms-plum)] py-3 text-[13px] font-bold text-white transition hover:brightness-110"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--ms-border)]" />
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#EDF5FF]">
              <AlertTriangle className="h-6 w-6 text-[var(--ms-plum)]" strokeWidth={1.85} />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="mt-1 rounded-full p-1 text-[var(--ms-mauve)] hover:bg-[var(--ms-soft-bg)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-[18px] font-bold text-[var(--ms-navy)]">Report a problem</h2>
          <p className="mt-1 text-[13px] text-[var(--ms-mauve)]">
            Tell us what isn&apos;t working. We read every report.
          </p>

          <div className="mt-4 space-y-3">
            {/* Category */}
            <div>
              <label htmlFor="report-category" className="mb-1.5 block text-[12px] font-semibold text-[var(--ms-navy)]">
                Category
              </label>
              <select
                id="report-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-[14px] text-[var(--ms-navy)] outline-none focus:border-[var(--ms-plum)] transition"
              >
                <option value="">Select a category…</option>
                <option value="bug">App bug or crash</option>
                <option value="payment">Payment issue</option>
                <option value="booking">Booking problem</option>
                <option value="content">Inappropriate content</option>
                <option value="account">Account problem</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-[var(--ms-navy)]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_CHARS))}
                rows={4}
                placeholder="Describe the problem in as much detail as possible…"
                className="w-full resize-none rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-[14px] leading-6 text-[var(--ms-navy)] outline-none placeholder:text-[var(--ms-border)] focus:border-[var(--ms-plum)] transition"
              />
              <p className={cn(
                "mt-1 text-right text-[11px]",
                atLimit ? "text-red-500" : "text-[var(--ms-mauve)]",
              )}>
                {description.length} / {MAX_CHARS}
                {tooShort && description.length > 0 && ` (min ${MIN_CHARS})`}
              </p>
            </div>

            {/* Screenshot */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-[var(--ms-navy)]">
                Screenshot <span className="font-normal text-[var(--ms-mauve)]">(optional)</span>
              </label>
              {screenshot ? (
                <div className="relative overflow-hidden rounded-[14px] border border-[var(--ms-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={screenshot} alt="Screenshot preview" className="max-h-40 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    aria-label="Remove screenshot"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2.5 rounded-[14px] border-2 border-dashed border-[var(--ms-border)] px-4 py-4 text-[13px] text-[var(--ms-mauve)] transition hover:border-[var(--ms-plum)] hover:text-[var(--ms-navy)]">
                  <Upload className="h-5 w-5 shrink-0" strokeWidth={1.85} />
                  <span>Attach a screenshot</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!category || tooShort}
              className="flex-1 rounded-full bg-[var(--ms-plum)] py-3 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              Submit report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--ms-navy)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(13,27,42,0.28)]">
      {msg}
    </div>
  );
}

// ─── Deactivate account modal ─────────────────────────────────────────────────

function DeactivateAccountModal({ onCancel }: { onCancel: () => void }) {
  const [step,     setStep]     = useState<"warn" | "password">("warn");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  function handleDeactivate() {
    if (!password.trim()) { setError("Please enter your password to continue."); return; }
    setLoading(true);
    setTimeout(() => {
      try {
        localStorage.setItem(
          "ms_account_status",
          JSON.stringify({ status: "deactivated", deactivatedAt: new Date().toISOString() }),
        );
      } catch { /* noop */ }
      clearAppSession();
      fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
      window.location.replace("/");
    }, 800);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step 1: Warning */}
        {step === "warn" && (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
              <BellOff className="h-6 w-6 text-amber-600" strokeWidth={1.85} />
            </div>
            <h3 className="text-[16px] font-bold text-[var(--ms-navy)]">Deactivate account?</h3>
            <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
              Deactivating temporarily hides your profile and posts from the community. You can reactivate anytime by signing back in.
            </p>
            <div className="mt-3 rounded-[12px] bg-amber-50 px-4 py-3">
              <ul className="space-y-1 text-[11px] leading-5 text-amber-700">
                <li>Your profile becomes invisible to other users</li>
                <li>Your posts and bookings are preserved</li>
                <li>You are signed out immediately</li>
              </ul>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep("password")}
                className="flex-1 rounded-full bg-amber-500 py-3 text-[13px] font-bold text-white transition hover:brightness-110"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 2: Password */}
        {step === "password" && (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
              <Lock className="h-6 w-6 text-amber-600" strokeWidth={1.85} />
            </div>
            <h3 className="text-[16px] font-bold text-[var(--ms-navy)]">Confirm deactivation</h3>
            <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
              Enter your password to deactivate your account.
            </p>
            <div className="mt-4">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Your password"
                className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-[14px] text-[var(--ms-navy)] outline-none focus:border-[var(--ms-plum)] transition"
              />
              {error && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("warn")}
                className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={loading}
                className="flex-1 rounded-full bg-amber-500 py-3 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Deactivating…" : "Deactivate"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Delete account modal ─────────────────────────────────────────────────────

function DeleteAccountModal({ onCancel }: { onCancel: () => void }) {
  const [step,    setStep]    = useState<"warn" | "confirm">("warn");
  const [typed,   setTyped]   = useState("");
  const [loading, setLoading] = useState(false);
  const canConfirm = typed === "DELETE";

  const gracePeriodDate = new Date();
  gracePeriodDate.setDate(gracePeriodDate.getDate() + 30);
  const gracePeriodStr = gracePeriodDate.toLocaleDateString("en-KE", {
    day: "numeric", month: "long", year: "numeric",
  });

  function handleDelete() {
    if (!canConfirm) return;
    setLoading(true);
    setTimeout(() => {
      try {
        localStorage.setItem(
          "ms_account_deletion",
          JSON.stringify({
            requestedAt: new Date().toISOString(),
            scheduledFor: gracePeriodDate.toISOString(),
            status: "pending",
          }),
        );
      } catch { /* noop */ }
      clearAppSession();
      window.location.replace("/");
    }, 800);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step 1: Red warning */}
        {step === "warn" && (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-red-50">
              <UserX className="h-6 w-6 text-red-500" strokeWidth={1.85} />
            </div>
            <h3 className="text-[16px] font-bold text-[var(--ms-navy)]">Are you sure?</h3>
            <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
              Deleting your account permanently removes your profile, posts, and personal data from Mobile Salon.
            </p>
            <div className="mt-3 rounded-[12px] bg-red-50 px-4 py-3">
              <p className="text-[12px] font-bold text-red-600">This cannot be undone.</p>
              <ul className="mt-1.5 space-y-1 text-[11px] leading-5 text-red-700">
                <li>Your account is deactivated immediately</li>
                <li>Permanent deletion on <strong>{gracePeriodStr}</strong> (30-day grace)</li>
                <li>Reviews you wrote are anonymised, not deleted</li>
              </ul>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="flex-1 rounded-full bg-red-600 py-3 text-[13px] font-bold text-white transition hover:brightness-110"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 2: Type DELETE */}
        {step === "confirm" && (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-red-50">
              <UserX className="h-6 w-6 text-red-500" strokeWidth={1.85} />
            </div>
            <h3 className="text-[16px] font-bold text-[var(--ms-navy)]">Delete account</h3>
            <p className="mt-2 text-[13px] leading-5 text-[var(--ms-mauve)]">
              Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm permanent account deletion.
            </p>
            <div className="mt-4">
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-[14px] font-semibold tracking-widest text-[var(--ms-navy)] outline-none focus:border-red-400 transition"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("warn")}
                className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-[13px] font-semibold text-[var(--ms-navy)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || loading}
                className="flex-1 rounded-full bg-red-600 py-3 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {loading ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main SettingsUI ──────────────────────────────────────────────────────────

export function SettingsUI() {
  const [settings,         setSettings]         = useState<AppSettings>(readSettings);
  const [session,          setSession]          = useState<AppUserSession | null>(null);
  const [langPref,         setLangPref]         = useState<LangPref>({ code: "en", label: "English", dir: "ltr" });
  const [showAgeModal,     setShowAgeModal]      = useState(false);
  const [showSignOut,      setShowSignOut]       = useState(false);
  const [showDeactivate,   setShowDeactivate]    = useState(false);
  const [showDelete,       setShowDelete]        = useState(false);
  const [showLanguage,     setShowLanguage]      = useState(false);
  const [showTwoFactor,    setShowTwoFactor]     = useState(false);
  const [twoFactorAction,  setTwoFactorAction]   = useState<"enable" | "disable">("enable");
  const [showReportModal,  setShowReportModal]   = useState(false);
  const [showClearCache,   setShowClearCache]    = useState(false);
  const [showDownloadData, setShowDownloadData]  = useState(false);
  const [showPhoneChange,  setShowPhoneChange]   = useState(false);
  const [storageUsed,      setStorageUsed]       = useState("< 1 KB");
  const [toast,            setToast]             = useState<string | null>(null);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  // ── Sync settings + session ────────────────────────────────────────────────
  useEffect(() => {
    function sync() {
      setSettings(readSettings());
      setSession(readAppSession());
    }
    sync();
    window.addEventListener(SETTINGS_CHANGE_EVENT, sync);
    window.addEventListener(APP_SESSION_EVENT,      sync);
    window.addEventListener("storage",              sync);
    return () => {
      window.removeEventListener(SETTINGS_CHANGE_EVENT, sync);
      window.removeEventListener(APP_SESSION_EVENT,      sync);
      window.removeEventListener("storage",              sync);
    };
  }, []);

  // ── Apply CSS side effects ─────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-color-scheme", settings.colorScheme);
    const zoomMap: Record<string, string> = { small: "0.9", medium: "1", large: "1.15" };
    root.style.setProperty("--ms-zoom", zoomMap[settings.textSize] ?? "1");
    if (settings.reduceMotion) root.setAttribute("data-reduce-motion", "true");
    else root.removeAttribute("data-reduce-motion");
    if (settings.highContrast) root.setAttribute("data-high-contrast", "true");
    else root.removeAttribute("data-high-contrast");
  }, [settings.colorScheme, settings.textSize, settings.reduceMotion, settings.highContrast]);

  // ── Apply saved language pref on mount ─────────────────────────────────────
  useEffect(() => {
    const pref = readLangPref();
    setLangPref(pref);
    document.documentElement.lang = pref.code;
    document.documentElement.dir  = pref.dir;
    setStorageUsed(calcStorageUsed());
  }, []);

  const isGuest    = !session || session.role === "guest";
  const isProvider = session?.role === "professional" || session?.role === "salon";
  const sessionPhone = isGuest ? "" : (session as { phone?: string }).phone ?? "";

  function patch<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings(setSetting(key, value));
  }

  function handleAdultToggle(on: boolean) {
    if (!on) { setSettings(writeSettings({ showAdultProducts: false })); return; }
    if (settings.adultProductsAgeVerified) {
      setSettings(writeSettings({ showAdultProducts: true }));
    } else {
      setShowAgeModal(true);
    }
  }

  function handleAgeConfirmed(dob: string) {
    setSettings(writeSettings({ showAdultProducts: true, adultProductsAgeVerified: true, adultProductsVerifiedAt: new Date().toISOString(), adultProductsDOB: dob }));
    setShowAgeModal(false);
    showToast("Adult products enabled");
  }

  // This function runs when the user clicks "Sign Out"
  async function handleSignOut() {
    // Clear localStorage session immediately so UI updates
    clearAppSession();
    // Clear the server-side httpOnly cookie
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Network error — cookie will expire naturally; user is already logged out locally
    }
    
    // 4. Close the confirmation box
    setShowSignOut(false);
    
    // 5. Force the page to refresh/redirect so they are officially logged out
    window.location.href = "/";
  }

  function handleTwoFactorToggle(next: boolean) {
    setTwoFactorAction(next ? "enable" : "disable");
    setShowTwoFactor(true);
  }

  function handleTwoFactorConfirmed() {
    const enabling = twoFactorAction === "enable";
    patch("twoFactorEnabled", enabling);
    setShowTwoFactor(false);
    showToast(enabling ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
  }

  function handleClearCacheConfirmed() {
    const keepKeys = new Set([
      "ms_app_settings.v1",
      "mobile-salon.client-session.v1",
      "ms_social_posts",
      "ms_bookings",
      "ms_messages",
      "ms_social_saves",
      "ms_social_follows",
      "ms_team_members.v1",
      "ms_account_status",
      "ms_account_deletion",
    ]);
    try {
      const toRemove = Object.keys(localStorage).filter((k) => k.startsWith("ms_") && !keepKeys.has(k));
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch { /* noop */ }
    setStorageUsed(calcStorageUsed());
    setShowClearCache(false);
    showToast("Temporary cache cleared");
  }

  function handleDownloadDataConfirmed() {
    try {
      localStorage.setItem("ms_data_download_request", JSON.stringify({ requestedAt: new Date().toISOString(), status: "pending" }));
    } catch { /* noop */ }
    setShowDownloadData(false);
    showToast("Request received — file ready within 48 hours");
  }

  function handlePhoneSaved(newPhone: string) {
    if (!session || session.role === "guest") return;
    const updated = { ...session, phone: newPhone } as AppUserSession;
    writeAppSession(updated);
    setShowPhoneChange(false);
    showToast("Phone number updated");
  }

  // ── Row definitions ────────────────────────────────────────────────────────

  const accountRows: RowDef[] = [
    {
      kind: "link",
      icon: User,
      label: "Edit profile",
      sub: isGuest ? "Sign in to manage your profile" : getDisplayName(session),
      href: isGuest ? "/auth/sign-in" : "/settings/edit-profile",
      iconBg: "bg-[#F0EBFF]",
    },
    {
      kind: "link",
      icon: Phone,
      label: "Phone number",
      sub: isGuest ? "—" : (sessionPhone || "Not set"),
      onClick: isGuest ? undefined : () => setShowPhoneChange(true),
      href: isGuest ? "/auth/sign-in" : undefined,
    },
    {
      kind: "link",
      icon: UserCog,
      label: "Account type",
      value: isGuest ? "Guest" : getAccountLabel(session),
      readOnly: true,
      dim: true,
    },
    {
      kind: "link",
      icon: Languages,
      label: "Language",
      value: langPref.label,
      onClick: () => setShowLanguage(true),
    },
  ];

  // Privacy B1–B4 only for clients
  const clientPrivacyRows: RowDef[] = session?.role === "client" ? [
    {
      kind: "toggle",
      icon: Lock,
      label: "Private account",
      sub: "Only your followers can see your posts",
      on: settings.privateAccount,
      onChange: (v) => patch("privateAccount", v),
      iconBg: "bg-[#EDF5FF]",
    },
    {
      kind: "toggle",
      icon: Eye,
      label: "Activity status",
      sub: "Let others see when you were last active",
      on: settings.showActivityStatus,
      onChange: (v) => patch("showActivityStatus", v),
    },
    {
      kind: "toggle",
      icon: Users,
      label: "Direct messages",
      sub: "Allow anyone to message you",
      on: settings.allowDirectMessages,
      onChange: (v) => patch("allowDirectMessages", v),
    },
    {
      kind: "select",
      icon: MessageCircle,
      label: "Who can comment",
      sub: "Control who replies to your posts",
      value: settings.whoCanComment,
      options: [
        { value: "everyone",  label: "Everyone"  },
        { value: "followers", label: "Followers" },
        { value: "nobody",    label: "Nobody"    },
      ],
      onChange: (v) => patch("whoCanComment", v as AppSettings["whoCanComment"]),
    },
  ] : [];

  const privacyRows: RowDef[] = [
    ...clientPrivacyRows,
    {
      kind: "link",
      icon: UserX,
      label: "Blocked accounts",
      sub: "Manage who cannot see or interact with you",
      href: "/settings/blocked-accounts",
    },
    {
      kind: "link",
      icon: EyeOff,
      label: "Muted accounts",
      sub: "Posts from muted accounts won't appear in your feed",
      href: "/settings/muted-accounts",
    },
  ];

  const notificationRows: RowDef[] = [
    {
      kind: "toggle",
      icon: Bell,
      label: "Push notifications",
      sub: "Master switch for all notifications",
      on: settings.pushNotifications,
      onChange: (v) => patch("pushNotifications", v),
      iconBg: "bg-[#FEF0F3]",
    },
    {
      kind: "toggle",
      icon: Sparkles,
      label: "Likes",
      sub: "When someone likes your post",
      on: settings.notifyLikes,
      onChange: (v) => patch("notifyLikes", v),
      disabled: !settings.pushNotifications,
    },
    {
      kind: "toggle",
      icon: MessageCircle,
      label: "Comments",
      sub: "When someone comments on your post",
      on: settings.notifyComments,
      onChange: (v) => patch("notifyComments", v),
      disabled: !settings.pushNotifications,
    },
    {
      kind: "toggle",
      icon: Users,
      label: "New followers",
      sub: "When someone follows you",
      on: settings.notifyFollowers,
      onChange: (v) => patch("notifyFollowers", v),
      disabled: !settings.pushNotifications,
    },
    {
      kind: "toggle",
      icon: Repeat2,
      label: "Reposts",
      sub: "When someone reposts your content",
      on: settings.notifyReposts,
      onChange: (v) => patch("notifyReposts", v),
      disabled: !settings.pushNotifications,
    },
    {
      kind: "toggle",
      icon: MessageCircle,
      label: "Messages",
      sub: "New direct messages",
      on: settings.notifyMessages,
      onChange: (v) => patch("notifyMessages", v),
      disabled: !settings.pushNotifications,
    },
    {
      kind: "toggle",
      icon: Package,
      label: isProvider ? "New booking alerts" : "Booking reminders",
      sub: isProvider ? "Incoming booking requests from clients" : "Upcoming appointment alerts",
      on: settings.notifyBookings,
      onChange: (v) => patch("notifyBookings", v),
      disabled: !settings.pushNotifications,
    },
    ...(!isProvider ? [{
      kind: "toggle" as const,
      icon: ShoppingBag,
      label: "Offers & promotions",
      sub: "Deals from salons and pros you follow",
      on: settings.notifyOffers,
      onChange: (v: boolean) => patch("notifyOffers", v),
      disabled: !settings.pushNotifications,
    }] : []),
    {
      kind: "toggle",
      icon: Bell,
      label: "Platform announcements",
      sub: "Updates from the Mobile Salon team",
      on: settings.notifyAnnouncements,
      onChange: (v) => patch("notifyAnnouncements", v),
      disabled: !settings.pushNotifications,
    },
  ];

  const counterRows: RowDef[] = [
    {
      kind: "toggle",
      icon: settings.showAdultProducts ? ShieldCheck : ShieldOff,
      label: "18+ products",
      sub: settings.showAdultProducts
        ? "Adult products are visible. Tap to disable."
        : "Hidden by default. Tap to enable with age verification.",
      on: settings.showAdultProducts,
      onChange: handleAdultToggle,
      iconBg: settings.showAdultProducts ? "bg-amber-50" : "bg-[var(--ms-soft-bg)]",
    },
    {
      kind: "toggle",
      icon: Sparkles,
      label: "Product suggestions",
      sub: "Show personalised product picks based on your services",
      on: settings.showProductSuggestions,
      onChange: (v) => patch("showProductSuggestions", v),
    },
    {
      kind: "link",
      icon: ShoppingBag,
      label: "Order history",
      sub: "View your past Counter purchases",
      href: "/counter/cart",
    },
  ];

  const feedRows: RowDef[] = [
    {
      kind: "toggle",
      icon: Repeat2,
      label: "Show reposts in feed",
      sub: "Display content reposted by people you follow",
      on: settings.showReposts,
      onChange: (v) => patch("showReposts", v),
    },
    {
      kind: "toggle",
      icon: Sparkles,
      label: "Suggested posts",
      sub: "See posts from creators you don't follow yet",
      on: settings.showSuggestedPosts,
      onChange: (v) => patch("showSuggestedPosts", v),
    },
    {
      kind: "toggle",
      icon: Volume2,
      label: "Autoplay videos",
      sub: "Videos play silently as you scroll",
      on: settings.autoplayVideos,
      onChange: (v) => patch("autoplayVideos", v),
    },
  ];

  const appearanceRows: RowDef[] = [
    {
      kind: "select",
      icon: Palette,
      label: "Color scheme",
      sub: "Choose light, dark, or follow your device",
      value: settings.colorScheme,
      options: [
        { value: "light",  label: "Light"  },
        { value: "dark",   label: "Dark"   },
        { value: "system", label: "System" },
      ],
      onChange: (v) => patch("colorScheme", v as AppSettings["colorScheme"]),
      iconBg: "bg-[#FEF0F3]",
    },
    {
      kind: "select",
      icon: Type,
      label: "Text size",
      sub: "Adjust how large text appears throughout the app",
      value: settings.textSize,
      options: [
        { value: "small",  label: "S" },
        { value: "medium", label: "M" },
        { value: "large",  label: "L" },
      ],
      onChange: (v) => patch("textSize", v as AppSettings["textSize"]),
    },
  ];

  const accessibilityRows: RowDef[] = [
    {
      kind: "toggle",
      icon: Zap,
      label: "Reduce motion",
      sub: "Minimise animations and transitions throughout the app",
      on: settings.reduceMotion,
      onChange: (v) => patch("reduceMotion", v),
    },
    {
      kind: "toggle",
      icon: Monitor,
      label: "High contrast",
      sub: "Increase contrast for better readability",
      on: settings.highContrast,
      onChange: (v) => patch("highContrast", v),
    },
  ];

  const securityRows: RowDef[] = [
    {
      kind: "toggle",
      icon: Shield,
      label: "Two-factor authentication",
      sub: settings.twoFactorEnabled
        ? "Your account is protected with 2FA"
        : "Require a code from your phone when signing in",
      on: settings.twoFactorEnabled,
      onChange: handleTwoFactorToggle,
      iconBg: "bg-[#E8F5F2]",
    },
    {
      kind: "toggle",
      icon: Bell,
      label: "Login alerts",
      sub: "Get notified when your account is accessed from a new device",
      on: settings.loginAlerts,
      onChange: (v) => { patch("loginAlerts", v); showToast("Login alerts " + (v ? "enabled" : "disabled")); },
    },
    {
      kind: "link",
      icon: Smartphone,
      label: "Active sessions",
      sub: "See all devices where you are signed in",
      href: "/settings/active-sessions",
    },
    {
      kind: "link",
      icon: Lock,
      label: "Change password",
      href: "/settings/change-password",
    },
  ];

  const storageRows: RowDef[] = [
    {
      kind: "link",
      icon: Trash2,
      label: "Clear cache",
      sub: "Remove temporary data to free up space",
      onClick: () => setShowClearCache(true),
    },
    {
      kind: "link",
      icon: Download,
      label: "Download your data",
      sub: "Get a copy of your posts, bookings, and account data",
      onClick: () => setShowDownloadData(true),
    },
    {
      kind: "link",
      icon: Database,
      label: "Storage used",
      value: storageUsed,
      readOnly: true,
    },
    {
      kind: "link",
      icon: WifiOff,
      label: "Offline mode",
      sub: "Coming soon",
      readOnly: true,
    },
  ];

  const supportRows: RowDef[] = [
    {
      kind: "link",
      icon: HelpCircle,
      label: "Help center",
      href: "/help",
      iconBg: "bg-[#EDF5FF]",
    },
    {
      kind: "link",
      icon: AlertTriangle,
      label: "Report a problem",
      sub: "Tell us if something isn't working",
      onClick: () => setShowReportModal(true),
    },
    {
      kind: "link",
      icon: Shield,
      label: "Safety information",
      sub: "Our commitment to your safety on Mobile Salon",
      href: "/safety",
    },
    {
      kind: "link",
      icon: BookOpen,
      label: "Community guidelines",
      href: "/community-guidelines",
    },
  ];

  const aboutRows: RowDef[] = [
    {
      kind: "link",
      icon: Info,
      label: "About Mobile Salon",
      value: process.env.NEXT_PUBLIC_APP_VERSION ?? "v0.1.0",
      href: "/about",
      iconBg: "bg-[#F0EBFF]",
    },
    {
      kind: "link",
      icon: FileText,
      label: "Terms of service",
      href: "/terms",
    },
    {
      kind: "link",
      icon: Lock,
      label: "Privacy policy",
      href: "/privacy",
    },
    {
      kind: "link",
      icon: LayoutGrid,
      label: "Open-source licenses",
      href: "/licenses",
    },
  ];

  const dangerRows: RowDef[] = [
    {
      kind: "link",
      icon: LogOut,
      label: "Sign out",
      onClick: () => setShowSignOut(true),
      danger: true,
    },
    {
      kind: "link",
      icon: BellOff,
      label: "Deactivate account",
      sub: "Temporarily hides your profile and posts",
      onClick: () => setShowDeactivate(true),
      danger: true,
    },
    {
      kind: "link",
      icon: UserX,
      label: "Delete account",
      sub: "Permanently removes your account and data",
      onClick: () => setShowDelete(true),
      danger: true,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-28 pt-2">

      {/* Account card */}
      {!isGuest && session && (
        <Link
          href="/settings/edit-profile"
          className="flex items-center gap-4 rounded-[22px] bg-[linear-gradient(135deg,var(--ms-plum),#7C3A6F)] px-5 py-5 text-white shadow-[0_6px_28px_rgba(132,36,92,0.22)] transition hover:brightness-105"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
            {getDisplayName(session)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">{getDisplayName(session)}</p>
            <p className="text-[12px] text-white/70">{getAccountLabel(session)}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60" />
        </Link>
      )}

      {isGuest && (
        <Link
          href="/auth/sign-in"
          className="flex items-center gap-4 rounded-[22px] border border-[var(--ms-border)] bg-white px-5 py-5 shadow-[0_1px_6px_rgba(13,27,42,0.06)] transition hover:shadow-[0_4px_16px_rgba(13,27,42,0.1)]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--ms-soft-bg)]">
            <User className="h-7 w-7 text-[var(--ms-mauve)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-[var(--ms-navy)]">Sign in to your account</p>
            <p className="text-[12px] text-[var(--ms-mauve)]">Access all settings and personalise your experience</p>
          </div>
          <ChevronRight className="h-5 w-5 text-[var(--ms-border)]" />
        </Link>
      )}

      <Section title="Account"><RowGroup rows={accountRows} /></Section>
      <Section title="Privacy &amp; Safety"><RowGroup rows={privacyRows} /></Section>
      <Section title="Notifications"><RowGroup rows={notificationRows} /></Section>

      {FEATURES.SHOP && !isProvider && (
        <Section title="Counter — Shop">
          <div className="border-b border-[var(--ms-border)]/60 px-4 py-4">
            <div className="flex items-start gap-3 rounded-[14px] bg-amber-50 p-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={1.85} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-amber-800">18+ products hidden by default</p>
                <p className="mt-0.5 text-[11px] leading-4 text-amber-700">
                  Adult products on Counter are hidden unless you verify your age below. Products are intended for adults aged 18 and above only.
                </p>
              </div>
            </div>
          </div>
          <RowGroup rows={counterRows} />
        </Section>
      )}

      <Section title="Feed &amp; Content"><RowGroup rows={feedRows} /></Section>
      <Section title="Appearance"><RowGroup rows={appearanceRows} /></Section>
      <Section title="Accessibility"><RowGroup rows={accessibilityRows} /></Section>
      <Section title="Security"><RowGroup rows={securityRows} /></Section>
      <Section title="Data &amp; Storage"><RowGroup rows={storageRows} /></Section>
      <Section title="Support"><RowGroup rows={supportRows} /></Section>
      <Section title="About"><RowGroup rows={aboutRows} /></Section>

      <Section title="Account actions">
        <RowGroup rows={isGuest ? [] : dangerRows} />
        {isGuest && (
          <div className="flex flex-col items-center gap-1 px-4 py-5">
            <p className="text-[13px] text-[var(--ms-mauve)]">Not signed in</p>
            <Link
              href="/auth/sign-in"
              className="mt-1 rounded-full bg-[var(--ms-plum)] px-6 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110"
            >
              Sign in
            </Link>
          </div>
        )}
      </Section>

      <p className="pb-4 text-center text-[11px] leading-6 text-[var(--ms-mauve)]">
        Mobile Salon · Beauty, softly handled · Kenya
        <br />
        For women, by women
      </p>

      {/* ── Modals ── */}
      {showAgeModal && (
        <AgeVerifyModal onConfirm={handleAgeConfirmed} onCancel={() => setShowAgeModal(false)} />
      )}
      {showSignOut && (
        <SignOutConfirm onConfirm={handleSignOut} onCancel={() => setShowSignOut(false)} />
      )}
      {showDeactivate && (
        <DeactivateAccountModal onCancel={() => setShowDeactivate(false)} />
      )}
      {showDelete && (
        <DeleteAccountModal onCancel={() => setShowDelete(false)} />
      )}
      {showLanguage && (
        <LanguageModal
          currentCode={langPref.code}
          onSave={(pref) => setLangPref(pref)}
          onClose={() => setShowLanguage(false)}
        />
      )}
      {showTwoFactor && (
        <TwoFactorModal
          mode={twoFactorAction}
          maskedPhone={maskPhone(sessionPhone)}
          onConfirm={handleTwoFactorConfirmed}
          onCancel={() => setShowTwoFactor(false)}
        />
      )}
      {showReportModal && (
        <ReportProblemModal onClose={() => setShowReportModal(false)} />
      )}
      {showClearCache && (
        <ClearCacheConfirmModal
          onConfirm={handleClearCacheConfirmed}
          onCancel={() => setShowClearCache(false)}
        />
      )}
      {showDownloadData && (
        <DownloadDataConfirmModal
          maskedPhone={maskPhone(sessionPhone)}
          onConfirm={handleDownloadDataConfirmed}
          onCancel={() => setShowDownloadData(false)}
        />
      )}
      {showPhoneChange && (
        <PhoneChangeSheet
          currentPhone={sessionPhone}
          onSaved={handlePhoneSaved}
          onCancel={() => setShowPhoneChange(false)}
        />
      )}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
