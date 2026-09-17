import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { SectionReveal } from "@/components/marketplace-ui";
import { ServicesCatalogue } from "@/components/services-catalogue";
import { platformRevenueRules } from "@/lib/business-model";
import { marketplacePackages, services } from "@/lib/site-data";

export default function ServicesPage() {
  const categories = [...new Set(services.map((service) => service.category))];

  return (
    <AppShell currentNav="book" roleMode="salons" requireSession>
      <div className="section-grid">
        <SectionReveal className="silk-panel decorative-orbit overflow-hidden rounded-[36px] p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.66fr)_minmax(320px,0.34fr)] xl:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-\[var\(--color-secondary\)]">Service catalogue</p>
              <h1 className="mt-3 text-4xl font-semibold text-[var(--color-primary)]">Choose the glow you want.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-\[var\(--color-secondary\)]">
                Start with a deal if you know the occasion, or search services by category when you already know the exact care you need.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  className="rounded-full bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(217,70,239,0.22)] transition hover:bg-[var(--color-primary)]"
                  href="#deals"
                >
                  View deals first
                </Link>
                <Link
                  className="rounded-full border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-warning)] hover:bg-[var(--surface-card)]"
                  href="#services-picker"
                >
                  Search services
                </Link>
                {categories.slice(0, 4).map((category) => (
                  <Link
                    className="rounded-full border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-secondary)]/35 hover:bg-[var(--surface-elevated)]"
                    href="#services-picker"
                    key={category}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] bg-white/86 p-5 shadow-[0_16px_38px_rgba(132,36,92,0.1)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-secondary)]">Fast path</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Packages help you decide faster.</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-secondary)]">
                Birthday, bridal, vacation, self-care, and last-minute reset options are placed before the full service list.
              </p>
              <div className="mt-5">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]"
                  href="/book?package=true"
                >
                  Book a package
                </Link>
              </div>
            </div>
          </div>
        </SectionReveal>

        <ServicesCatalogue categories={categories} packages={marketplacePackages} services={services} />

        <SectionReveal className="beauty-card rounded-[34px] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-\[var\(--color-secondary\)]">Business rules</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--color-primary)]">Styld protects both sides.</h2>
          <div className="mt-5 space-y-3">
            {platformRevenueRules.map((rule) => (
              <p className="rounded-[22px] bg-[var(--surface-card)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]" key={rule}>
                {rule}
              </p>
            ))}
          </div>
        </SectionReveal>
      </div>
    </AppShell>
  );
}
