"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, BriefcaseBusiness, ArrowRight, MapPin, Scissors, MapPin as MapPinIcon, CalendarDays } from "lucide-react";

import { PublicLayout } from "@/components/public-layout";
import { UnifiedAuthFlow } from "@/components/auth/unified-auth-flow";
import { readAppSession } from "@/lib/client-session";

export default function ProfessionalOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const [step, setStep] = useState<"welcome" | "profile" | "services" | "complete">("welcome");
  const [profile, setProfile] = useState({
    displayName: "",
    specialty: "",
    serviceMode: "both",
    location: "",
    bio: "",
    areasServed: [] as string[],
  });
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const searchParamsData = useSearchParams();
  const returnTo = "/workspace/professional";

  const specialtyOptions = [
    "Braiding & Protective Styles",
    "Natural Hair & Curls",
    "Locs & Sisterlocks",
    "Hair Coloring & Dye",
    "Weaves & Extensions",
    "Silk Press & Styling",
    "Cuts & Fades",
    "Bridal & Events",
    "Makeup Artistry",
    "Lashes & Brows",
    "Nail Art & Extensions",
    "Skincare & Facials",
    "Massage Therapy",
    "Waxing & Threading",
  ];

  const serviceModeOptions = [
    { value: "mobile", label: "Mobile only" },
    { value: "in_salon", label: "In-salon only" },
    { value: "both", label: "Both mobile & in-salon" },
  ];

  const kenyaLocations = [
    "Nairobi - Westlands",
    "Nairobi - Kilimani",
    "Nairobi - Lavington",
    "Nairobi - Karen",
    "Nairobi - CBD",
    "Nairobi - Kileleshwa",
    "Nairobi - Parklands",
    "Mombasa",
    "Kisumu",
    "Nakuru",
    "Eldoret",
    "Other",
  ];

  const updateProfile = (field: string, value: string | string[]) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const toggleService = (service: string) => {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleComplete = () => {
    // Navigate to professional workspace
    window.location.href = "/workspace/professional";
  };

  const handleBack = () => {
    if (step === "profile") setStep("welcome");
    else if (step === "services") setStep("profile");
    else if (step === "complete") setStep("services");
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <a href="/auth/sign-in" className="text-sm underline">
            Back to sign in
          </a>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex items-center gap-2" role="progressbar" aria-label="Onboarding progress">
          {["Welcome", "Profile", "Services", "Complete"].map((label, i) => (
            <React.Fragment key={label}>
              <div
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  (step === "welcome" && i === 0) ||
                  (step === "profile" && i === 1) ||
                  (step === "services" && i === 2) ||
                  (step === "complete" && i === 3)
                    ? "bg-[var(--color-ink)]"
                    : "bg-[var(--border-subtle)]"
                }`}
              />
              {i < 3 && (
                <div
                  className={`h-1.5 w-4 transition-colors ${
                    (step === "profile" && i === 0) ||
                    (step === "services" && i <= 1) ||
                    (step === "complete" && i <= 2)
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
            <WelcomeStep onContinue={() => setStep("profile")} />
          )}

          {step === "profile" && (
            <ProfileStep
              profile={profile}
              onUpdate={updateProfile}
              specialtyOptions={specialtyOptions}
              serviceModeOptions={serviceModeOptions}
              kenyaLocations={kenyaLocations}
              onContinue={() => setStep("services")}
              onBack={() => setStep("welcome")}
            />
          )}

          {step === "services" && (
            <ServicesStep
              services={services}
              onToggle={toggleService}
              specialtyOptions={specialtyOptions}
              onContinue={() => setStep("complete")}
              onBack={() => setStep("profile")}
            />
          )}

          {step === "complete" && (
            <CompleteStep onBack={() => setStep("services")} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
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

        <a href="/discover" className="mt-4 block text-center text-sm underline">
          Continue as guest
        </a>
      </div>
    </div>
  );
}

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--color-clay)]">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.14-1.14a5.5 5.5 0 0 0-7.78 7.78l1.09 1.09a5.5 5.5 0 0 0 0 7.78l2.09 2.09a5.5 5.5 0 0 0 7.78 0l1.09-1.09a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)]">
        Welcome to STYLD Professional
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        Set up your professional workspace to showcase your skills, manage
        bookings, and grow your client base.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => {}}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          Continue with email
        </button>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Already have an account?{" "}
          <a className="underline" href="/auth/sign-in">
            Sign in
          </a>
        </p>
      </div>

      <button onClick={() => {}} className="mt-4 block w-full rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]">
        Continue as guest
      </button>

      <div className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
        <p>By continuing, you agree to our <a className="underline" href="/legal/terms">Terms</a> and <a className="underline" href="/legal/privacy">Privacy Policy</a>.</p>
      </div>

      <button onClick={() => {}} className="mt-4 block w-full rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]">
        Continue with email
      </button>
    </div>
  );
}

function ProfileStep({
  profile,
  onUpdate,
  specialtyOptions,
  serviceModeOptions,
  kenyaLocations,
  onContinue,
  onBack,
}: {
  profile: {
    displayName: string;
    specialty: string;
    serviceMode: string;
    location: string;
    bio: string;
    areasServed: string[];
  };
  onUpdate: (field: string, value: string | string[]) => void;
  specialtyOptions: string[];
  serviceModeOptions: { value: string; label: string }[];
  kenyaLocations: string[];
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
          Professional profile
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Tell us about your expertise and how you work.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Display name
          </span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={50}
            autoComplete="name"
            className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
            placeholder="Your name"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Specialty
          </span>
          <select
            className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-ink)]"
          >
            <option value="">Select your specialty</option>
            {specialtyOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Service mode
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "mobile", label: "Mobile" },
              { value: "in_salon", label: "In-salon" },
              { value: "both", label: "Both" },
            ].map((mode) => (
              <label key={mode.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="serviceMode"
                  value={mode.value}
                  className="sr-only"
                />
                <div className={`relative flex h-12 items-center justify-center rounded-xl border-2 text-sm font-medium transition ${
                  "border-[var(--border-subtle)] hover:border-[var(--color-clay)]"
                }`}>
                  {mode.label}
                </div>
              </label>
            ))}
          </div>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Location
          </span>
          <input
            type="text"
            list="kenya-locations"
            className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
            placeholder="Your base location"
          />
          <datalist id="kenya-locations">
            {[
              "Nairobi - Westlands",
              "Nairobi - Kilimani",
              "Nairobi - Lavington",
              "Nairobi - Karen",
              "Nairobi - CBD",
              "Nairobi - Kileleshwa",
              "Nairobi - Parklands",
              "Mombasa",
              "Kisumu",
              "Nakuru",
              "Eldoret",
              "Other",
            ].map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Bio (optional)
          </span>
          <textarea
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
            placeholder="Tell clients about your experience and approach..."
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Areas served
          </span>
          <input
            type="text"
            placeholder="e.g., Westlands, Kilimani, Lavington (comma separated)"
            className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
            placeholder="Comma-separated areas"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
        >
          Back
        </button>
        <button
          className="flex-1 rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ServicesStep({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack: () => void;
}) {
  const popularServices = [
    "Braiding & Protective Styles",
    "Natural Hair & Curls",
    "Locs & Sisterlocks",
    "Hair Coloring & Dye",
    "Weaves & Extensions",
    "Silk Press & Styling",
    "Cuts & Fades",
    "Bridal & Events",
    "Makeup Artistry",
    "Lashes & Brows",
    "Nail Art & Extensions",
    "Skincare & Facials",
    "Massage Therapy",
    "Waxing & Threading",
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
          Services you offer
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Select the services you provide. You can update this anytime in your workspace.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {popularServices.map((service) => (
          <button
            key={service}
            type="button"
            className="relative flex cursor-pointer items-center gap-2 rounded-2xl border-2 p-4 transition text-left hover:border-[var(--color-clay)]"
          >
            <span className="flex-1 text-sm font-medium">{service}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          className="flex-1 rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
        >
          Back
        </button>
        <button
          className="flex-1 rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
        >
          Complete setup
        </button>
      </div>
    </div>
  );
}

function CompleteStep() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
        Your professional workspace is ready
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Your profile has been created. You can now manage requests, services, and messages.
      </p>
      <a
        href="/workspace/professional"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
      >
        Go to workspace
      </a>
    </div>
  );
}

export default ProfessionalOnboardingPage;