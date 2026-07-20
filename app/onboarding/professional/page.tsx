import { CreditCard, ImagePlus, Palette, ShieldCheck, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { CTAButton, ProfileCompletionCard, SectionReveal } from "@/components/marketplace-ui";
import { SessionLaunchButton } from "@/components/session-launch-button";
import { professionalQualityStandards } from "@/lib/business-model";
import { profileCompletionTasks, serviceCategories } from "@/lib/site-data";

export default function ProfessionalOnboardingPage() {
  return (
    <AppShell currentNav="profile" roleMode="professionals" showBottomNav={false}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.68fr)_minmax(320px,0.32fr)]">
        <SectionReveal className="silk-panel decorative-orbit overflow-hidden rounded-[36px] p-6 lg:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Professional onboarding</p>
          <h1 className="mt-3 text-4xl font-semibold text-[var(--ms-plum)]">Set up a profile clients can trust at first glance.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ms-mauve)]">
            Your page can feel personal, but it must stay clear: strong image, visible prices, exact durations, locations, portfolio proof, and payout readiness.
          </p>

          <div className="mt-8 section-grid">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Display name" />
              <FormField label="Specialty" placeholder="Braider, makeup artist, nail tech..." />
              <FormField label="Location" />
              <FormField label="Phone" />
            </div>

            <div className="rounded-[28px] bg-[var(--ms-soft-bg)] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Categories</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {serviceCategories.map((category) => (
                  <button
                    className="rounded-full border border-[var(--ms-border)] bg-white px-4 py-2 text-sm text-[var(--ms-navy)]"
                    key={category.id}
                    type="button"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Service mode" placeholder="In salon, mobile, or both" />
              <FormField label="Areas served" placeholder="Kilimani, Lavington, South B..." />
            </div>

            <label className="block rounded-[24px] border border-[var(--ms-border)] bg-white px-4 py-4">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Short bio</span>
              <textarea
                className="mt-3 min-h-28 w-full resize-none bg-transparent text-sm leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
                placeholder="Tell clients what you are best at, who you serve, and what your appointment style feels like."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <SetupCard
                copy="Choose one clear profile photo or salon hero image with good contrast."
                icon={<Palette className="h-5 w-5" />}
                title="Brand look"
              />
              <SetupCard
                copy="Add at least six images: finished work, close-up, tools, station, and before/after."
                icon={<ImagePlus className="h-5 w-5" />}
                title="Portfolio"
              />
              <SetupCard
                copy="Connect payout details before paid requests can be released."
                icon={<WalletCards className="h-5 w-5" />}
                title="Payout"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Starter service" placeholder="e.g. Knotless braids" />
              <FormField label="Price range" placeholder="KES 3,000 - 6,500" />
              <FormField label="Duration" placeholder="3 - 6 hrs" />
              <FormField label="Service inclusions" placeholder="Wash, prep, install, finish..." />
            </div>

            <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ms-petal)] text-[var(--ms-rose)]">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Payment protection</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--ms-plum)]">Paid requests only.</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--ms-mauve)]">
                    Clients must sign in and pay before you receive a confirmed request. Payout release happens after completion confirmation or support review.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <SessionLaunchButton destination="/profile" role="professional">
                Save onboarding draft
              </SessionLaunchButton>
              <CTAButton href="/profile" variant="outline">
                Open professional profile
              </CTAButton>
            </div>
          </div>
        </SectionReveal>

        <div className="section-grid">
          <ProfileCompletionCard progress={72} tasks={profileCompletionTasks} />
          <SectionReveal className="rounded-[32px] bg-[var(--ms-navy)] p-6 text-white shadow-[0_18px_48px_rgba(13,27,42,0.22)]">
            <p className="text-xs uppercase tracking-[0.22em] text-white/60">Why this matters</p>
            <h2 className="mt-3 text-3xl font-semibold">Professionals are not secondary.</h2>
            <p className="mt-4 text-sm leading-7 text-white/74">
              Your profile needs to sell clarity: what you do, where you work, how much it costs, and why a client should trust you.
            </p>
            <div className="mt-5 grid gap-3">
              {professionalQualityStandards.map((standard) => (
                <div className="flex items-center gap-3 rounded-[20px] bg-white/8 px-4 py-3" key={standard}>
                  <ShieldCheck className="h-4 w-4 text-[var(--ms-gold)]" />
                  <p className="text-sm text-white/74">{standard}</p>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </div>
    </AppShell>
  );
}

function SetupCard({
  icon,
  title,
  copy,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[26px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_12px_30px_rgba(132,36,92,0.06)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ms-petal)] text-[var(--ms-rose)]">
        {icon}
      </span>
      <h3 className="mt-4 text-xl font-semibold text-[var(--ms-plum)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">{copy}</p>
    </div>
  );
}

function FormField({
  label,
  placeholder,
}: {
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="block rounded-[24px] border border-[var(--ms-border)] bg-white px-4 py-4">
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">{label}</span>
      <input
        className="mt-3 w-full bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
        placeholder={placeholder ?? label}
      />
    </label>
  );
}
