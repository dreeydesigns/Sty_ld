"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Mail, ArrowRight, Lock, User, AlertCircle } from "lucide-react";

import { PublicLayout } from "@/components/public-layout";
import { UnifiedAuthFlow } from "@/components/auth/unified-auth-flow";

export default function ClientOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; from?: string }>;
}) {
  const [step, setStep] = useState<"welcome" | "preferences" | "complete">("welcome");
  const [preferences, setPreferences] = useState({
    interests: [] as string[],
    notifications: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const searchParamsData = useSearchParams();
  const returnTo = searchParamsData.get("returnTo") || "/workspace/client";

  const interestOptions = [
    { id: "hair", label: "Hair & Braids", icon: "💇" },
    { id: "nails", label: "Nails & Art", icon: "💅" },
    { id: "makeup", label: "Makeup & Lashes", icon: "💄" },
    { id: "skincare", label: "Skincare & Facials", icon: "✨" },
    { id: "massage", label: "Massage & Wellness", icon: "🧘" },
    { id: "brows", label: "Brows & Threading", icon: "👁️" },
  ];

  const toggleInterest = (id: string) => {
    setPreferences((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
  };

  const handleComplete = () => {
    if (preferences.interests.length === 0) {
      // Allow skipping - just continue
    }
    router.push("/workspace/client");
  };

  const handleBack = () => {
    if (step === "preferences") setStep("welcome");
    else if (step === "complete") setStep("preferences");
  };

  return (
    <PublicLayout backHref="/auth/sign-in" backLabel="Sign in">
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/auth/sign-in" className="text-sm underline">
            Back to sign in
          </Link>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex items-center gap-2" role="progressbar" aria-label="Onboarding progress">
          {["Welcome", "Preferences", "Complete"].map((label, i) => (
            <React.Fragment key={label}>
              <div
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  (step === "welcome" && i === 0) ||
                  (step === "preferences" && i === 1) ||
                  (step === "complete" && i === 2)
                    ? "bg-[var(--color-ink)]"
                    : "bg-[var(--border-subtle)]"
                }`}
              />
              {i < 2 && (
                <div
                  className={`h-1.5 w-4 transition-colors ${
                    (step === "preferences" && i === 0) ||
                    (step === "complete" && i <= 1)
                      ? "bg-[var(--color-ink)]"
                      : "bg-[var(--border-subtle)]"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-sm">
          {step === "welcome" && (
            <WelcomeStep
              onContinue={() => setStep("preferences")}
              error={error}
            />
          )}

          {step === "preferences" && (
            <PreferencesStep
              interests={preferences.interests}
              onToggleInterest={toggleInterest}
              onContinue={handleComplete}
              onBack={handleBack}
              error={error}
            />
          )}

          {step === "complete" && (
            <CompleteStep
              onContinue={handleComplete}
              onBack={handleBack}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          By continuing, you agree to our{" "}
          <Link className="underline" href="/legal/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link className="underline" href="/legal/privacy">
            Privacy Policy
          </Link>
          .
        </p>

        <Link href="/discover" className="mt-4 block text-center text-sm underline">
          Continue as guest
        </Link>
      </div>
    </PublicLayout>
  );
}

function WelcomeStep({
  onContinue,
  error,
}: {
  onContinue: () => void;
  error?: string;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--color-clay)]">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.14-1.14a5.5 5.5 0 0 0-7.78 7.78l1.09 1.09a5.5 5.5 0 0 0 0 7.78l2.09 2.09a5.5 5.5 0 0 0 7.78 0l1.09-1.09a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)]">
        Welcome to STYLD
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        One account to discover beauty services, book appointments, and manage
        your preferences. No password to remember.
      </p>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <UnifiedAuthFlowEmbedded onComplete={() => {}} />
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          By continuing, you agree to our{" "}
          <a className="underline" href="/legal/terms">
            Terms
          </a>{" "}
          and{" "}
          <a className="underline" href="/legal/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </div>

      <button
        onClick={onContinue}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
      >
        Continue with email
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link className="underline" href="/auth/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function PreferencesStep({
  interests,
  onToggleInterest,
  onContinue,
  onBack,
  error,
}: {
  interests: string[];
  onToggleInterest: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
  error?: string;
}) {
  const interestOptions = [
    { id: "hair", label: "Hair & Braids" },
    { id: "nails", label: "Nails & Art" },
    { id: "makeup", label: "Makeup & Lashes" },
    { id: "skincare", label: "Skincare & Facials" },
    { id: "massage", label: "Massage & Wellness" },
    { id: "brows", label: "Brows & Threading" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
          What are you interested in?
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Select your interests to personalize your discovery feed. You can
          update this later in Settings.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "hair", label: "Hair & Braids", icon: "💇" },
          { id: "nails", label: "Nails & Art", icon: "💅" },
          { id: "makeup", label: "Makeup & Lashes", icon: "💄" },
          { id: "skincare", label: "Skincare & Facials", icon: "✨" },
          { id: "massage", label: "Massage & Wellness", icon: "🧘" },
          { id: "brows", label: "Brows & Threading", icon: "👁️" },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggleInterest(option.id)}
            className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
              interests.includes(option.id)
                ? "border-[var(--color-ink)] bg-[var(--color-ink)]/5 text-[var(--color-ink)]"
                : "border-[var(--border-subtle)] hover:border-[var(--color-clay)]"
            }`}
          >
            <span className="text-3xl">{["💇", "💅", "💄", "✨", "🧘", "👁️"][["hair", "nails", "makeup", "skincare", "massage", "brows"].indexOf(option.id)]}</span>
            <span className="text-sm font-medium">{option.label}</span>
            {interests.includes(option.id) && (
              <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ink)] text-white text-xs">
                ✓
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
        >
          Continue
        </button>
      </div>

      <p className="text-center text-xs text-[var(--text-muted)]">
        You can skip this and customize later in Settings.
      </p>
    </div>
  );
}

function CompleteStep({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
        You're all set!
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Your preferences have been saved. Let's find your next appointment.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
        >
          Go to workspace
        </button>
      </div>
    </div>
  );
}

function UnifiedAuthFlowEmbedded({ onComplete }: { onComplete: () => void }) {
  // This is a placeholder - the actual auth flow is in the separate page
  return null;
}

function handleContinue() {}