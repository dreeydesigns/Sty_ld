"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { imageAssets, salons } from "@/lib/site-data";
import { buildBookingHref } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function SalonProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const salon = Array.isArray(salons) ? salons.find((item) => item.slug === slug) : undefined;

  if (!salon) {
    return (
      <AppShell currentNav="discover">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-semibold">Salon not found</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">This profile is not available in the current STYLD catalog.</p>
          <Link href="/discover" className="mt-4 inline-flex rounded-full border border-[var(--border-subtle)] px-5 py-2 text-sm font-semibold">Back to Discover</Link>
        </div>
      </AppShell>
    );
  }

  const bookHref = buildBookingHref({ targetType: "salons", targetId: salon.slug });

  return (
    <AppShell currentNav="discover">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/discover?tab=salons" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Back to salons</Link>
        <section className="mt-4 overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-sm">
          <div className="grid gap-6 p-6 md:grid-cols-[320px_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[var(--bg-surface-raised)]">
              <Image
                src={salon.image?.url || imageAssets.braidsPortrait.url}
                alt={salon.name}
                fill
                sizes="(min-width: 768px) 320px, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Salon profile</p>
              <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none">{salon.name}</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{salon.tagline} · {salon.location}</p>
              <p className="mt-4 text-[15px] leading-7 text-[var(--text-secondary)]">{salon.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {salon.categoryTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">{tag}</span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={bookHref} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Plan appointment (preview)</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
