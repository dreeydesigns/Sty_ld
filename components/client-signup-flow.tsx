"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  createGuestSession,
  dismissPhotoNudge,
  isPhotoNudgeDismissed,
  readQuizTheme,
  readSignupDraft,
  writeAppSession,
  writeClientSession,
  writeSignupDraft,
} from "@/lib/client-session";
import { rankProfessionals } from "@/lib/discovery-ranking";
import {
  getThemeConfig,
  normalizeThemeKey,
  type ClientLocation,
  type ClientUserProfile,
  type ThemeKey,
} from "@/lib/personalization";
import { isValidE164, parsePhoneNumber } from "@/lib/phone-utils";
import { PhoneInput } from "@/components/phone-input";
import { professionals } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export function ClientSignupFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const safeReturnTo = returnTo?.startsWith("/") ? returnTo : "/home";

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("not_set");
  const [firstName, setFirstName] = useState("");
  const [fullPhone, setFullPhone] = useState("");   // E.164, e.g. "+254743817931"
  const [password, setPassword] = useState("");
  const [detailsError, setDetailsError] = useState("");   // validation error on the details step
  const [submitting, setSubmitting] = useState(false);
  const [locationMode, setLocationMode] = useState<ClientLocation["mode"] | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationData, setLocationData] = useState<ClientLocation | null>(null);
  const [profile, setProfile] = useState<ClientUserProfile | null>(null);
  const [photoNudgeHidden, setPhotoNudgeHidden] = useState(false);
  const themeConfig = getThemeConfig(theme);
  const phoneIsValid = isValidE164(fullPhone);
  const passwordScore = getPasswordScore(password);
  const detailsValid = firstName.trim().length > 0 && phoneIsValid && password.length >= 8;
  const rankedProfessionals = rankProfessionals(
    professionals.filter((professional) => professional.verified),
    "top-rated",
    theme,
  ).slice(0, 4);

  useEffect(() => {
    const draft = readSignupDraft();
    const storedTheme = normalizeThemeKey(draft?.theme ?? readQuizTheme());

    setTheme(storedTheme);
    setFirstName(draft?.firstName ?? "");
    if (draft?.phone) setFullPhone(parsePhoneNumber(draft.phone).fullE164);
    setPassword(draft?.password ?? "");
    setPhotoNudgeHidden(isPhotoNudgeDismissed());
  }, []);

  function persistDetails(next?: Partial<{ firstName: string; phone: string; password: string }>) {
    writeSignupDraft({
      firstName: next?.firstName ?? firstName,
      phone:     next?.phone     ?? fullPhone,
      password:  next?.password  ?? password,
      theme,
      tribeBadge: themeConfig.tribeBadge,
    });
  }

  async function continueToLocationStep() {
    if (!detailsValid || submitting) return;
    setSubmitting(true);
    setDetailsError("");
    persistDetails();

    writeSignupDraft({ phone: fullPhone, firstName, password, theme, tribeBadge: themeConfig.tribeBadge });
    setStep(4);
    setSubmitting(false);
  }


  async function createClientProfile(location: ClientLocation) {
    setSubmitting(true);
    writeSignupDraft({ location, firstName, phone: fullPhone, password, theme, tribeBadge: themeConfig.tribeBadge });

    try {
      const response = await fetch("/api/auth/client/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          phone: fullPhone,
          password,
          theme,
          tribeBadge: themeConfig.tribeBadge,
          location,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; profile?: ClientUserProfile };

      if (!response.ok || !result.ok || !result.profile) {
        throw new Error("Profile could not be created");
      }

      writeClientSession(result.profile);
      setProfile(result.profile);
      setStep(5);
    } catch {
      const fallbackProfile: ClientUserProfile = {
        id: `client_${Date.now()}`,
        role: "client",
        firstName,
        phone: fullPhone,
        theme,
        tribeBadge: themeConfig.tribeBadge,
        quizCompleted: theme !== "not_set",
        themeSetBy: theme === "not_set" ? "fallback" : "quiz",
        themeUpdatedAt: new Date().toISOString(),
        location,
        subscription: { tier: "none", status: "teaser" },
        tribes: theme === "not_set" ? [] : [theme],
        createdAt: new Date().toISOString(),
      };

      writeClientSession(fallbackProfile);
      setProfile(fallbackProfile);
      setStep(5);
    } finally {
      setSubmitting(false);
    }
  }

  function useGpsLocation() {
    setLocationMode("gps");
    setLocationError("");

    if (!("geolocation" in navigator)) {
      setLocationMode("manual");
      setLocationError("GPS is not available here. Type your area instead.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: ClientLocation = {
          mode: "gps",
          label: "Near Nairobi - GPS saved",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocationData(nextLocation);
        setManualLocation("");
      },
      () => {
        setLocationMode("manual");
        setLocationData(null);
        setLocationError("No problem. Type your area manually instead.");
      },
      { maximumAge: 60000, timeout: 8000 },
    );
  }

  function continueFromLocation() {
    let nextLocation: ClientLocation;

    if (locationMode === "gps" && locationData) {
      nextLocation = locationData;
    } else if (locationMode === "manual" && manualLocation.trim().length >= 2) {
      nextLocation = { mode: "manual", label: manualLocation.trim() };
    } else {
      nextLocation = { mode: "skipped", label: "Location skipped for now" };
    }

    void createClientProfile(nextLocation);
  }

  return (
    <main
      className="min-h-screen px-4 py-5 text-[var(--ms-charcoal)]"
      style={{ background: `linear-gradient(135deg, ${themeConfig.softColor}, #ffffff 58%, #FDF7F2)` }}
    >
      <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-5xl content-center">
        <div className="overflow-hidden rounded-[40px] border border-[var(--ms-border)] bg-white shadow-[0_28px_90px_rgba(13,27,42,0.12)]">
          {step < 5 ? (
            <div className="border-b border-[var(--ms-border)] bg-white/90 p-5">
              <div className="flex items-center justify-between gap-3">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                  style={{ backgroundColor: themeConfig.accentColor }}
                >
                  {theme === "not_set" ? "Client signup" : `${themeConfig.displayName} saved`}
                </span>
                <span className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ms-mauve)] sm:inline">
                  Client signup
                </span>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <ScreenShell>
              <p className="font-display text-5xl leading-tight text-[var(--ms-plum)]">Your world is ready for you.</p>
              <p className="mt-4 text-sm leading-7 text-[var(--ms-mauve)]">
                Create your account and we&apos;ll hold your world, your theme, and your preferences - exactly as you chose them.
              </p>
              <div
                className="mt-6 rounded-[26px] border p-4 text-sm font-semibold"
                style={{ borderColor: `${themeConfig.accentColor}44`, backgroundColor: themeConfig.softColor, color: themeConfig.darkColor }}
              >
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: themeConfig.accentColor }} />
                Your theme: {themeConfig.displayName} - saved the moment you sign up.
              </div>
              <div className="mt-6 grid gap-3">
                <ValueRow
                  accentColor={themeConfig.accentColor}
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Your personalised feed"
                  copy="Professionals and salons matched to your aesthetic, from day one."
                />
                <ValueRow
                  accentColor={themeConfig.accentColor}
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Your privacy, always"
                  copy="Your contact details are never shared until a booking is confirmed."
                />
                <ValueRow
                  accentColor={themeConfig.accentColor}
                  icon={<UserRound className="h-5 w-5" />}
                  title="Your tribe, when you're ready"
                  copy="Connect with women who share your world and your sense of beauty."
                />
              </div>

              {/* B2 — Create account (primary) */}
              <button
                className="mt-7 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition hover:brightness-110"
                onClick={() => setStep(2)}
                style={{ backgroundColor: themeConfig.accentColor }}
                type="button"
              >
                Create my account
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* B1 — Continue as guest (secondary) */}
              <button
                className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-6 text-sm font-semibold text-[var(--ms-mauve)] transition hover:bg-white hover:text-[var(--ms-navy)]"
                onClick={() => {
                  const guest = createGuestSession();
                  writeAppSession(guest);
                  router.push(safeReturnTo);
                }}
                type="button"
              >
                Continue without signing in
              </button>
              <p className="mt-2 text-center text-xs leading-5 text-[var(--ms-mauve)]">
                Guest mode: view-only for 24 hours. You won&apos;t be able to book, post, or interact until you create an account.
              </p>

              <p className="mt-4 text-center text-xs leading-6 text-[var(--ms-mauve)]">
                By continuing, you agree to Styld&apos;s privacy expectations, booking rules, and protected marketplace terms.
              </p>
            </ScreenShell>
          ) : null}

          {step === 2 ? (
            <ScreenShell>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Step 2 of 4 — Your details</p>
              <h1 className="mt-3 font-display text-5xl leading-tight text-[var(--ms-plum)]">Tell us your first name.</h1>
              <p className="mt-4 text-sm leading-7 text-[var(--ms-mauve)]">Just three things. That&apos;s all we need right now.</p>
              <div className="mt-6 grid gap-4">
                <label className="block rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ms-mauve)]">First name</span>
                  <input
                    className="mt-3 w-full bg-transparent text-base font-semibold text-[var(--ms-navy)] outline-none"
                    onChange={(event) => {
                      setFirstName(event.target.value);
                      persistDetails({ firstName: event.target.value });
                    }}
                    placeholder="e.g. Wanjiku"
                    value={firstName}
                  />
                </label>
                <PhoneInput
                  value={fullPhone}
                  onChange={(e164) => {
                    setFullPhone(e164);
                    persistDetails({ phone: e164 });
                  }}
                />
                <p className="text-xs text-[var(--ms-mauve)]">This is how we verify you. No spam. Ever.</p>
                <label className="block rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Password</span>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[var(--ms-navy)] outline-none"
                      onChange={(event) => {
                        setPassword(event.target.value);
                        persistDetails({ password: event.target.value });
                      }}
                      placeholder="At least 8 characters"
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="shrink-0 text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${passwordScore.score * 25}%`,
                        backgroundColor: passwordScore.color,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold" style={{ color: passwordScore.color }}>
                    {passwordScore.label}
                  </p>
                </label>
              </div>
              {detailsError && (
                <p className="rounded-[16px] bg-red-50 px-4 py-3 text-sm font-semibold text-[var(--ms-danger)]">
                  {detailsError}
                </p>
              )}
              <button
                className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition disabled:opacity-40"
                disabled={!detailsValid || submitting}
                onClick={() => void continueToLocationStep()}
                style={{ backgroundColor: themeConfig.accentColor }}
                type="button"
              >
                {submitting ? "Processing…" : "Continue"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
              <p className="mt-4 rounded-[22px] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm leading-6 text-[var(--ms-mauve)]">
                We will never share your number. Your profile is private until you choose to book.
              </p>
            </ScreenShell>
          ) : null}

          {step === 4 ? (
            <ScreenShell>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Step 3 of 4 — Where you are</p>
              <h1 className="mt-3 font-display text-5xl leading-tight text-[var(--ms-plum)]">Where should we look for you?</h1>
              <p className="mt-4 text-sm leading-7 text-[var(--ms-mauve)]">
                This helps us show nearby salons and professionals first. You can skip and add it later.
              </p>
              <div className="mt-6 grid gap-3">
                <LocationChoice
                  accentColor={themeConfig.accentColor}
                  active={locationMode === "gps"}
                  copy={locationData?.label ?? "Most accurate — uses your device GPS."}
                  icon={<MapPin className="h-5 w-5" />}
                  onClick={useGpsLocation}
                  title="Use my current location"
                />
                <LocationChoice
                  accentColor={themeConfig.accentColor}
                  active={locationMode === "manual"}
                  copy="Westlands, Kilimani, Karen, Lavington…"
                  icon={<Eye className="h-5 w-5" />}
                  onClick={() => {
                    setLocationMode("manual");
                    setLocationData(null);
                  }}
                  title="Type my neighbourhood"
                />
                {locationMode === "manual" ? (
                  <input
                    className="min-h-13 rounded-[22px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 text-sm font-semibold text-[var(--ms-navy)] outline-none"
                    onChange={(event) => setManualLocation(event.target.value)}
                    placeholder="e.g. Kilimani, Westlands, Karen"
                    value={manualLocation}
                  />
                ) : null}
                <LocationChoice
                  accentColor={themeConfig.accentColor}
                  active={locationMode === "skipped"}
                  copy="You'll see all Nairobi professionals for now."
                  icon={<ArrowRight className="h-5 w-5" />}
                  onClick={() => {
                    setLocationMode("skipped");
                    setLocationData(null);
                  }}
                  title="I'll set this later"
                />
              </div>
              {locationError ? <p className="mt-3 text-sm font-semibold text-[var(--ms-danger)]">{locationError}</p> : null}
              <button
                className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition disabled:opacity-40"
                disabled={submitting || (locationMode === "manual" && manualLocation.trim().length < 2)}
                onClick={continueFromLocation}
                style={{ backgroundColor: themeConfig.accentColor }}
                type="button"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </ScreenShell>
          ) : null}

          {step === 5 && profile ? (
            <div className="grid gap-0 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
              <div className="p-6 sm:p-8 lg:p-10">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                  style={{ backgroundColor: themeConfig.accentColor }}
                >
                  ✦ {theme === "not_set" ? "Account ready" : themeConfig.tribeBadge}
                </span>
                <h1 className="mt-6 font-display text-[34px] font-light leading-tight text-[var(--ms-plum)]">
                  {theme === "not_set" ? (
                    <>
                      Welcome, {profile.firstName}.<br />
                      Your account is ready.
                    </>
                  ) : (
                    <>
                      Welcome, {profile.firstName}.<br />
                      Your {themeConfig.displayName} world<br />
                      is ready.
                    </>
                  )}
                </h1>
                <p className="mt-4 text-sm leading-7 text-[var(--ms-mauve)]">
                  {theme === "not_set"
                    ? "Your phone is protected, your account is live, and you can personalise later if you want."
                    : "We saved your theme, protected your phone number, and prepared a first feed of verified beauty professionals matched to the world you chose."}
                </p>
                <button
                  className="mt-7 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition hover:brightness-110"
                  onClick={() => router.push(safeReturnTo)}
                  style={{ backgroundColor: themeConfig.accentColor }}
                  type="button"
                >
                  Enter my world
                  <ArrowRight className="h-4 w-4" />
                </button>
                {!photoNudgeHidden ? (
                  <div className="mt-5 rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-4">
                    <p className="text-sm font-semibold text-[var(--ms-navy)]">Add a profile photo later for a warmer, safer booking experience.</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--ms-mauve)]">
                      You can skip it for now. Your phone stays private until a booking is confirmed.
                    </p>
                    <button
                      className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[var(--ms-plum)]"
                      onClick={() => {
                        dismissPhotoNudge();
                        setPhotoNudgeHidden(true);
                      }}
                      type="button"
                    >
                      Not now
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3 bg-[var(--ms-soft-bg)] p-4 sm:p-6 lg:p-8">
                {rankedProfessionals.map((professional) => (
                  <Link
                    className="overflow-hidden rounded-[28px] bg-white shadow-[0_12px_34px_rgba(13,27,42,0.08)]"
                    href={`/professionals/${professional.slug}`}
                    key={professional.slug}
                  >
                    <div className="relative h-32">
                      {professional.image ? (
                        <Image
                          alt={professional.image.alt}
                          className="object-cover"
                          fill
                          sizes="(max-width: 768px) 50vw, 240px"
                          src={professional.image.url}
                          style={{ objectPosition: professional.image.position ?? "center" }}
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/72 to-transparent" />
                      <BadgeCheck className="absolute right-3 top-3 h-5 w-5 text-white" />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-[var(--ms-navy)]">{professional.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--ms-mauve)]">{professional.specialty}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ScreenShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-xl p-5 sm:p-8 lg:p-10">{children}</div>;
}

function ValueRow({
  icon,
  title,
  copy,
  accentColor,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  accentColor: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[24px] bg-[var(--ms-soft-bg)] p-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white"
        style={{ color: accentColor }}
      >
        {icon}
      </span>
      <div>
        <p className="font-semibold text-[var(--ms-navy)]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--ms-mauve)]">{copy}</p>
      </div>
    </div>
  );
}

function LocationChoice({
  active,
  copy,
  icon,
  onClick,
  title,
  accentColor,
}: {
  active: boolean;
  copy: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
  accentColor: string;
}) {
  return (
    <button
      className={cn(
        "rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5",
        active ? "text-[var(--ms-plum)]" : "border-[var(--ms-border)] bg-[var(--ms-soft-bg)] text-[var(--ms-navy)]",
      )}
      style={active ? { borderColor: accentColor, backgroundColor: `${accentColor}12` } : undefined}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white"
          style={{ color: accentColor }}
        >
          {icon}
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--ms-mauve)]">{copy}</p>
        </div>
      </div>
    </button>
  );
}

function getPasswordScore(password: string) {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (score <= 1) {
    return { score: Math.max(score, 1), label: "Weak password", color: "#B44A5A" };
  }

  if (score === 2) {
    return { score, label: "Fair password", color: "#BA7517" };
  }

  if (score === 3) {
    return { score, label: "Good password", color: "#1D9E75" };
  }

  return { score, label: "Strong password", color: "#1A7A6B" };
}
