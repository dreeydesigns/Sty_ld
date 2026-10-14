import Link from "next/link";
import Image from "next/image";

import { imageAssets } from "@/lib/site-data";

const SERVICE_CHIPS = ["Braids", "Locs", "Nails", "Make-up"] as const;

export function GuestHome() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="guest-welcome-title" className="max-w-[36rem]">
        <p className="font-display text-[clamp(1.75rem,5.4vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.025em]">
          Find a look. Meet the professional behind it.
        </p>
        <p className="mt-3 text-[15px] leading-[1.65] text-[var(--text-secondary)]">
          Browse real styles, see who offers them and compare starting prices before you book. Explore without signing in.
        </p>
        <Link
          href="/discover"
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white"
        >
          Browse looks
        </Link>
        <p className="mt-2.5 text-xs text-[var(--text-muted)]">Explore without signing in.</p>
      </section>

      <section className="overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <div className="relative aspect-[4/3] bg-[var(--bg-surface-raised)]">
          <Image
            src={imageAssets.salonBraiding.url}
            alt="Illustrative salon scene (sample imagery; local provider photography pending)"
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(29,29,27,0.72)] to-transparent px-4 pb-4 pt-12">
            <p className="text-[13px] font-semibold text-white">Browse work by style, maker and area</p>
            <p className="mt-0.5 text-[12px] text-white/85">Kilimani · Westlands · Karen and more</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="categories-title">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-[1.35rem] font-semibold leading-tight" id="categories-title">
            Explore by service
          </h2>
          <Link
            href="/discover"
            className="mb-0.5 shrink-0 text-xs font-semibold text-[var(--color-clay-text)] underline underline-offset-4"
          >
            All looks
          </Link>
        </div>
        <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SERVICE_CHIPS.map((chip) => (
            <Link
              key={chip}
              href="/explore"
              className="shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-[13px] font-medium"
            >
              {chip}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="look-title">
        <div className="mb-4">
          <h2 className="font-display text-[1.4rem] font-semibold leading-tight" id="look-title">
            A look to start with
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Service previews are illustrative until providers publish verified listings.</p>
        </div>
        <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-5 py-8 text-center">
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">No published looks yet</p>
          <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
            Look previews will appear here as professionals add genuine, reviewed work. In the meantime, browse by service.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-ink)] px-4 text-[13px] font-semibold text-[var(--color-ink)]"
          >
            Browse looks
          </Link>
        </div>
      </section>

      <section aria-labelledby="community-title" className="border-t border-[var(--border-subtle)] pt-6">
        <h2 className="font-display text-[1.35rem] font-semibold" id="community-title">
          From the Styld community
        </h2>
        <div className="mt-4 rounded-[18px] bg-[var(--bg-surface-raised)] px-4 py-5">
          <p className="text-[15px] font-semibold">No posts to show yet</p>
          <p className="mt-1.5 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
            Community posts will appear here when members share their work. You can explore looks and professionals in the meantime.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[var(--color-clay-text)] underline underline-offset-4"
          >
            Browse looks
          </Link>
        </div>
      </section>

      <section aria-label="Ways to explore Styld" className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-4">
        <p className="text-[13px] font-semibold">Browse by provider</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--text-secondary)]">
          <Link href="/professionals" className="underline underline-offset-4">Professionals</Link>
          <Link href="/salons" className="underline underline-offset-4">Salons</Link>
          <Link href="/services" className="underline underline-offset-4">Services</Link>
          <Link href="/explore" className="underline underline-offset-4">Looks</Link>
        </div>
      </section>
    </div>
  );
}
