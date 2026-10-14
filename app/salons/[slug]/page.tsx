"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { imageAssets, salons, services } from "@/lib/site-data";
import { buildBookingHref } from "@/lib/utils";

export default function SalonProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const salon = Array.isArray(salons) ? salons.find((item) => item.slug === slug) : undefined;

  if (!salon) {
    return (
      <AppShell currentNav="discover">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-semibold">Salon not found</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">No published salon corresponds to this link in the STYLD catalogue.</p>
          <Link href="/discover?tab=salons" className="mt-4 inline-flex rounded-full border border-[var(--border-subtle)] px-5 py-2 text-sm font-semibold">Back to Discover</Link>
        </div>
      </AppShell>
    );
  }

  const bookHref = buildBookingHref({ targetType: "salons", targetId: salon.slug });
  const serviceRecords = (salon.serviceIds ?? [])
    .map((id) => services.find((service) => service.id === id))
    .filter(Boolean);

  return (
    <AppShell currentNav="discover">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/discover?tab=salons" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Back to salons</Link>
        <section className="mt-4 overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-sm">
          <div className="grid gap-6 p-6 md:grid-cols-[320px_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[var(--bg-surface-raised)]">
              <Image src={salon.image?.url || imageAssets.braidsPortrait.url} alt={salon.name} fill sizes="(min-width: 768px) 320px, 100vw" className="object-cover" unoptimized />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Salon profile (catalogue)</p>
              <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none">{salon.name}</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{salon.tagline} · {salon.location}</p>
              <p className="mt-4 text-[15px] leading-7 text-[var(--text-secondary)]">{salon.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {salon.categoryTags.map((tag) => <span key={tag} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">{tag}</span>)}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={bookHref} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Plan appointment preview</Link>
                <Link href="/service-comparison" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Compare services</Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
            <h2 className="font-display text-2xl font-semibold">Catalogue services</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Service values come from static catalogue data and omit anything unavailable.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {serviceRecords.length ? serviceRecords.map((service) => (
                <div key={service?.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">
                  <p className="font-semibold text-[var(--text-primary)]">{service?.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{service?.description}</p>
                  <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">KES {service?.minPrice}{service?.maxPrice && service.maxPrice !== service.minPrice ? `-${service.maxPrice}` : ""} · {service?.durationMin} min</p>
                </div>
              )) : <p className="text-sm text-[var(--text-secondary)]">No published catalogue service links for this salon.</p>}
            </div>
          </section>
          <aside className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
            <h2 className="font-display text-xl font-semibold">Data provenance</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">This salon is represented by existing STYLD catalogue records, not a verified registered business presence. No opening hours, staff rosters, amenities, reviews or service availability are invented.</p>
            <p className="mt-4 text-xs text-[var(--text-muted)]">Unverified providers must not be represented as active marketplace businesses.</p>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
