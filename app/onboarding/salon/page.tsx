import {
  BadgeCheck,
  Banknote,
  Building2,
  CalendarDays,
  Gem,
  ImagePlus,
  ListChecks,
  MapPin,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { CTAButton, SectionReveal } from "@/components/marketplace-ui";
import { SessionLaunchButton } from "@/components/session-launch-button";
import { platformRevenueRules, professionalQualityStandards } from "@/lib/business-model";
import { serviceCategories } from "@/lib/site-data";

const setupSteps = [
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Business profile",
    copy: "Name, area, opening rhythm, service model, and the exact kind of clients you serve.",
  },
  {
    icon: <ListChecks className="h-5 w-5" />,
    title: "Service menu",
    copy: "Clear categories, visible prices, durations, inclusions, and package-ready services.",
  },
  {
    icon: <UsersRound className="h-5 w-5" />,
    title: "Team showcase",
    copy: "Add professionals, specialties, availability, and the services each person can accept.",
  },
  {
    icon: <ImagePlus className="h-5 w-5" />,
    title: "Portfolio proof",
    copy: "Show finished work, clean stations, tools, salon atmosphere, and style close-ups.",
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    title: "Verification",
    copy: "Verification helps clients trust your business and helps your listing rank better.",
  },
  {
    icon: <Banknote className="h-5 w-5" />,
    title: "Protected payout",
    copy: "Client payment is held first, then payout is released after service completion is confirmed.",
  },
];

const listingPlans = [
  {
    name: "Basic",
    price: "Listed and bookable",
    copy: "A clear salon page with services, portfolio, hours, and booking requests.",
  },
  {
    name: "Growth",
    price: "Featured placement ready",
    copy: "Designed for salons that want stronger visibility, packages, and analytics.",
  },
  {
    name: "Premium",
    price: "Verification and support ready",
    copy: "Prepared for top placement, verified status, richer reports, and dedicated support.",
  },
];

export default function SalonOnboardingPage() {
  return (
    <AppShell currentNav="profile" roleMode="salons" showBottomNav={false}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.68fr)_minmax(320px,0.32fr)]">
        <SectionReveal className="silk-panel overflow-hidden rounded-[36px] p-6 lg:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Salon onboarding</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight text-[var(--ms-plum)]">
            Build a salon page clients can trust before they walk in.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ms-mauve)]">
            Mobile Salon gives salons and spas a proper digital booking presence: services, team, portfolio, listing plan, verification, and protected payment flow in one place.
          </p>

          <div className="mt-8 section-grid">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Salon or spa name" />
              <FormField label="Contact person" />
              <FormField label="Business phone" />
              <FormField label="Email" type="email" />
              <FormField label="Main location" placeholder="Kilimani, Westlands, Ruaka..." />
              <FormField label="Operating hours" placeholder="Mon-Sat, 8:00 AM - 7:00 PM" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block rounded-[24px] border border-[var(--ms-border)] bg-white px-4 py-4">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Business description</span>
                <textarea
                  className="mt-3 min-h-32 w-full resize-none bg-transparent text-sm leading-6 text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
                  placeholder="Tell clients what your salon is known for, the kind of care you provide, and what makes the appointment experience dependable."
                />
              </label>
              <div className="rounded-[24px] border border-[var(--ms-border)] bg-white px-4 py-4">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Service access</span>
                <div className="mt-4 grid gap-2">
                  {["In-salon appointments", "Mobile service available", "Group or event bookings"].map((option) => (
                    <label className="flex items-center gap-3 rounded-[18px] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm font-semibold text-[var(--ms-navy)]" key={option}>
                      <input className="h-4 w-4 accent-[var(--ms-rose)]" type="checkbox" />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <section className="rounded-[28px] bg-[var(--ms-soft-bg)] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--ms-rose)]">
                  <Gem className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Service categories</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--ms-plum)]">Choose the categories clients should find you under.</h2>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {serviceCategories.map((category) => (
                  <button
                    className="rounded-full border border-[var(--ms-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ms-navy)] transition hover:border-[var(--ms-rose)]/35 hover:bg-[var(--ms-petal)]"
                    key={category.id}
                    type="button"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Starter service" placeholder="e.g. Gel manicure" />
              <FormField label="Starting price" placeholder="KES 1,500" />
              <FormField label="Duration" placeholder="45 - 75 mins" />
              <FormField label="Service inclusions" placeholder="Prep, service, finishing oil..." />
            </div>

            <section className="grid gap-4 md:grid-cols-3">
              {listingPlans.map((plan) => (
                <div className="rounded-[26px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_12px_30px_rgba(132,36,92,0.06)]" key={plan.name}>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">{plan.name}</p>
                  <h3 className="mt-3 text-xl font-semibold text-[var(--ms-plum)]">{plan.price}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">{plan.copy}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {setupSteps.map((step) => (
                <SetupCard copy={step.copy} icon={step.icon} key={step.title} title={step.title} />
              ))}
            </section>

            <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ms-petal)] text-[var(--ms-rose)]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Marketplace protection</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--ms-plum)]">Serious bookings only.</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--ms-mauve)]">
                    Clients sign in and pay before confirmed requests reach your salon. Mobile Salon keeps funds protected until the service is completed and confirmed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <SessionLaunchButton destination="/profile" role="salon">
                Save salon draft
              </SessionLaunchButton>
              <CTAButton href="/profile" variant="outline">
                Open salon profile
              </CTAButton>
            </div>
          </div>
        </SectionReveal>

        <div className="section-grid">
          <SectionReveal className="rounded-[32px] bg-[var(--ms-navy)] p-6 text-white shadow-[0_18px_48px_rgba(13,27,42,0.22)]">
            <p className="text-xs uppercase tracking-[0.22em] text-white/60">What improves ranking</p>
            <h2 className="mt-3 text-3xl font-semibold">Trust makes the listing work harder.</h2>
            <div className="mt-5 grid gap-3">
              {professionalQualityStandards.slice(0, 5).map((standard) => (
                <div className="flex items-center gap-3 rounded-[20px] bg-white/8 px-4 py-3" key={standard}>
                  <ShieldCheck className="h-4 w-4 text-[var(--ms-gold)]" />
                  <p className="text-sm text-white/74">{standard}</p>
                </div>
              ))}
            </div>
          </SectionReveal>

          <SectionReveal className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Revenue model</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)]">Built for a real marketplace.</h2>
            <div className="mt-5 space-y-3">
              {platformRevenueRules.slice(0, 4).map((rule) => (
                <p className="rounded-[20px] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm leading-6 text-[var(--ms-charcoal)]" key={rule}>
                  {rule}
                </p>
              ))}
            </div>
          </SectionReveal>

          <SectionReveal className="rounded-[32px] bg-white p-6 shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Operations</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)]">Keep walk-ins and bookings organised.</h2>
            <div className="mt-5 grid gap-3">
              {[
                ["Calendar", "Block busy times and show real availability.", <CalendarDays className="h-4 w-4" key="calendar" />],
                ["Location", "Set branch area, mobile radius, and service zones.", <MapPin className="h-4 w-4" key="location" />],
                ["Team", "Assign requests to the right professional.", <UsersRound className="h-4 w-4" key="team" />],
              ].map(([title, copy, icon]) => (
                <div className="flex items-start gap-3 rounded-[20px] bg-[var(--ms-soft-bg)] px-4 py-3" key={title as string}>
                  <span className="mt-0.5 text-[var(--ms-rose)]">{icon}</span>
                  <div>
                    <p className="font-semibold text-[var(--ms-navy)]">{title as string}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ms-mauve)]">{copy as string}</p>
                  </div>
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
  type = "text",
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block rounded-[24px] border border-[var(--ms-border)] bg-white px-4 py-4">
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">{label}</span>
      <input
        className="mt-3 w-full bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
        placeholder={placeholder ?? label}
        type={type}
      />
    </label>
  );
}
