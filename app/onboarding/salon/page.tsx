"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, BriefcaseBusiness, MapPin, Users, Building2, CalendarDays } from "lucide-react";

import { PublicLayout } from "@/components/public-layout";
import { UnifiedAuthFlow } from "@/components/auth/unified-auth-flow";

export default function SalonOnboardingPage() {
  const [step, setStep] = useState<"welcome" | "business" | "services" | "team" | "complete">("welcome");
  const [business, setBusiness] = useState({
    salonName: "",
    contactName: "",
    description: "",
    location: "",
    serviceArea: "",
    categories: [] as string[],
  });
  const [services, setServices] = useState<string[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const categoryOptions = [
    "Hair Salon",
    "Beauty Spa",
    "Nail Bar",
    "Multi-service Salon",
    "Barbershop",
    "Spa & Wellness Center",
    "Bridal Studio",
    "Med Spa",
  ];

  const serviceOptions = [
    "Hair Cutting & Styling",
    "Hair Coloring & Treatments",
    "Braiding & Protective Styles",
    "Locs & Sisterlocks",
    "Weaves & Extensions",
    "Natural Hair Care",
    "Hair Coloring & Dye",
    "Silk Press & Styling",
    "Cuts & Fades",
    "Bridal & Event Styling",
    "Makeup Artistry",
    "Lashes & Brows",
    "Nail Art & Extensions",
    "Manicure & Pedicure",
    "Skincare & Facials",
    "Massage Therapy",
    "Waxing & Threading",
    "Body Treatments",
    "Bridal Packages",
    "Spa Packages",
  ];

  const updateBusiness = (field: string, value: string | string[]) => {
    // Business state update handled by individual handlers
  };

  const toggleService = (service: string) => {
    // Service toggle handled by individual handlers
  };

  const handleComplete = () => {
    window.location.href = "/workspace/salon";
  };

  const handleBack = () => {
    // Navigation handled by individual steps
  };

  function renderWelcomeStep() {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--color-clay)]">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <path d="M8 21h16M8 17h16M8 13h16M8 9h16" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)]">
          Welcome to STYLD Salon
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Set up your salon workspace to manage your business, team, services,
          and client requests.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setStep("business")}
            className="mt-4 block w-full rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
          >
            Continue with email
          </button>

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

        <button className="mt-4 block w-full rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]">
          Continue as guest
        </button>
      </div>
    );
  }

  function renderBusinessStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
            Business details
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Tell us about your salon.
          </p>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Salon name
            </span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              autoComplete="organization"
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
              placeholder="Your salon name"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Contact name
            </span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={50}
              autoComplete="name"
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
              placeholder="Primary contact name"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Location
            </span>
            <input
              type="text"
              required
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
              placeholder="Salon location"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Service area
            </span>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
              placeholder="e.g., Westlands, Kilimani"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Description
            </span>
            <textarea
              rows={3}
              maxLength={500}
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
              placeholder="Tell clients about your salon"
            />
          </label>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setStep("welcome")}
            className="flex-1 rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
          >
            Back
          </button>
          <button
            onClick={() => setStep("services")}
            className="flex-1 rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  function renderServicesStep() {
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
          {[
            "Hair Cutting & Styling",
            "Hair Coloring & Treatments",
            "Braiding & Protective Styles",
            "Locs & Sisterlocks",
            "Weaves & Extensions",
            "Natural Hair Care",
            "Hair Coloring & Dye",
            "Silk Press & Styling",
            "Cuts & Fades",
            "Bridal & Event Styling",
            "Makeup Artistry",
            "Lashes & Brows",
            "Nail Art & Extensions",
            "Manicure & Pedicure",
            "Skincare & Facials",
            "Massage Therapy",
            "Waxing & Threading",
            "Body Treatments",
            "Bridal Packages",
            "Spa Packages",
          ].map((service) => (
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
            onClick={() => setStep("business")}
            className="flex-1 rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
          >
            Back
          </button>
          <button
            onClick={() => setStep("team")}
            className="flex-1 rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  function renderTeamStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
            Team members
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Add team members who will have access to this workspace.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Team member email
            </span>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-ink)]"
              placeholder="team@salon.com"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Role
            </span>
            <select
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-ink)]"
            >
              <option value="stylist">Stylist</option>
              <option value="manager">Manager</option>
              <option value="receptionist">Receptionist</option>
            </select>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("services")}
            className="flex-1 rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]"
          >
            Back
          </button>
          <button
            onClick={() => setStep("complete")}
            className="flex-1 rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  function renderCompleteStep() {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
          Your salon workspace is ready
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Your profile has been created. You can now manage requests, services, and messages.
        </p>
        <a
          href="/workspace/salon"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
        >
          Go to workspace
        </a>
      </div>
    );
  }

  function renderStepContent() {
    switch (step) {
      case "welcome":
        return renderWelcomeStep();
      case "business":
        return renderBusinessStep();
      case "services":
        return renderServicesStep();
      case "team":
        return renderTeamStep();
      case "complete":
        return renderCompleteStep();
      default:
        return renderWelcomeStep();
    }
  }

  function renderWelcomeStep() {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--color-clay)]">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <path d="M8 21h16M8 17h16M8 13h16M8 9h16" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)]">
          Welcome to STYLD Salon
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Set up your salon workspace to manage your business, team, services,
          and client requests.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setStep("business")}
            className="mt-4 block w-full rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
          >
            Continue with email
          </button>

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

        <button className="mt-4 block w-full rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]">
          Continue as guest
        </button>
      </div>
    );
  }

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
          {["Welcome", "Business", "Services", "Team", "Complete"].map((label, i) => (
            <React.Fragment key={label}>
              <div
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i <= 4
                    ? "bg-[var(--color-ink)]"
                    : "bg-[var(--border-subtle)]"
                }`}
              />
              {i < 4 && (
                <div
                  className={`h-1.5 w-4 transition-colors `}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-sm">
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--color-clay)]">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <path d="M8 21h16M8 17h16M8 13h16M8 9h16" />
                </svg>
              </div>

              <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)]">
                Welcome to STYLD Salon
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Set up your salon workspace to manage your business, team, services,
                and client requests.
              </p>

              <div className="space-y-3">
                <button className="mt-4 block w-full rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85">
                  Continue with email
                </button>

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

              <button className="mt-4 block w-full rounded-xl border border-[var(--border-subtle)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-surface-raised)]">
                Continue as guest
              </button>
            </div>

            {renderStepContent()}
          </div>
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
    );
  );
}

export default SalonOnboardingPage;