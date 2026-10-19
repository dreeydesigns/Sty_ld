"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Crown,
  Gem,
  Lock,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StyldLockup } from "@/components/styld-logo";
import { FEATURES } from "@/lib/feature-flags";

/**
 * STYLD public landing — "Editorial Light" (approved Phase 2B direction).
 *
 * A bright, editorial beauty-publication experience built on the approved
 * Ink / Clay / Sage / Warm-White foundation with DM Sans + Playfair Display.
 *
 * Integrity rules honoured here:
 *  - The product preview and "Inside STYLD" block are clearly labelled
 *    ILLUSTRATIVE / SAMPLE DATA. No real providers, reviews, ratings,
 *    verification, popularity or availability are implied.
 *  - Booking requests and payments are NOT live (BOOKING_COMMITMENTS /
 *    PAYMENTS_LIVE are false). Copy says so explicitly.
 *  - Category imagery that is not yet verified-relevant uses an explicit
 *    "Image in progress" tile rather than an unrelated stock portrait.
 *  - No splash screen, no autoplay video, no Rose CTAs, no fabricated metrics.
 */

const categories = [
  { id: "hair", cat: "Hair", name: "Braids & natural hair", meta: "From KSh 800 · listed prices", image: null },
  { id: "nails", cat: "Nails", name: "Nails & gel", meta: "From KSh 600 · listed prices", image: "https://images.unsplash.com/photo-1633955726992-2b7c0d2d2a69?auto=format&fit=crop&w=640&q=70" },
  { id: "lashes", cat: "Lashes", name: "Lashes & brows", meta: "From KSh 1,200 · listed prices", image: null },
  { id: "makeup", cat: "Makeup", name: "Makeup artistry", meta: "From KSh 2,500 · listed prices", image: null },
  { id: "spa", cat: "Spa", name: "Spa & skin", meta: "From KSh 1,800 · listed prices", image: null },
];

const roles = [
  {
    id: "client",
    icon: Sparkles,
    label: "For clients",
    title: "Beauty care, clearly arranged.",
    copy: "See the look, the price, and the slot before you book.",
    highlights: ["Clear profiles", "Visible prices", "Mobile options"],
    cta: "Find my beauty pro",
    href: "/discover?tab=professionals",
  },
  {
    id: "salon",
    icon: Building2,
    label: "Salons",
    title: "A salon page that works while you work.",
    copy: "Show your team, menu, portfolio, and availability in one polished place.",
    highlights: ["Team showcase", "Service menu", "Client requests"],
    cta: "List my salon",
    href: "/onboarding/salon",
  },
  {
    id: "pro",
    icon: Crown,
    label: "Professionals",
    title: "Let your skill speak before you do.",
    copy: "Build a bookable profile with your portfolio, pricing, and services.",
    highlights: ["Portfolio first", "No rent barrier", "Direct connection"],
    cta: "Start as a professional",
    href: "/onboarding/professional?role=professional",
  },
];

const steps = [
  { number: "01", title: "Discover", copy: "Explore beauty services." },
  { number: "02", title: "Compare", copy: "Review available profile and service information." },
  { number: "03", title: "Plan", copy: "Preview appointment options. Booking requests are coming soon." },
];

const inspiration = [
  { src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=70", alt: "Illustrative portrait" },
  { src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=640&q=70", alt: "Illustrative portrait" },
  { src: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=640&q=70", alt: "Illustrative portrait" },
  { src: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=640&q=70", alt: "Illustrative portrait" },
];

const previewCards = [
  { name: "Sample Salon", meta: "Braids · Kilimani", price: "KSh 800", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=70" },
  { name: "Sample Studio", meta: "Nails · Westlands", price: "KSh 600", img: "https://images.unsplash.com/photo-1633955726992-2b7c0d2d2a69?auto=format&fit=crop&w=160&q=70" },
];

const navLinks = [
  { label: "Discover", href: "#discover" },
  { label: "Inside Styld", href: "#inside" },
  { label: "How it works", href: "#how" },
  { label: "Trust", href: "#trust" },
];

export default function LandingClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const paymentsLive = FEATURES.PAYMENTS_LIVE;

  const trust = [
    {
      icon: BadgeCheck,
      title: "Profile transparency",
      copy: "Professional profiles show the work, prices, and service areas providers share. Verified badges are not available yet while identity checks are being connected.",
      tag: "Verification coming soon",
    },
    {
      icon: Lock,
      title: "Private by default",
      copy: "Your phone number and exact residence are not shown on public profiles. Contact details unlock only after a booking is confirmed.",
      tag: "Private today",
    },
    {
      icon: ShieldCheck,
      title: paymentsLive ? "Pay inside Styld." : "Payments are not live yet.",
      copy: paymentsLive
        ? "Pay inside Styld and keep the record in one place. The amount and terms are shown before you pay."
        : "Styld does not collect payments yet. When payments go live, you will see the amount and terms inside Styld before you pay.",
      tag: paymentsLive ? "Live" : "Not live yet",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] font-sans text-[var(--color-ink)] antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[rgba(250,248,245,0.88)] backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-3 px-5 lg:px-12">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Styld home">
            <StyldLockup size={26} variant="default" />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:text-[var(--color-ink)]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" href="/auth/sign-in?returnTo=/home">
              Sign in
            </Button>
            <Button variant="primary" size="sm" href="/discover">
              <span className="hidden min-[400px]:inline">Explore beauty services</span>
              <span className="min-[400px]:hidden">Explore</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-transparent text-[var(--color-ink)] lg:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen ? (
          <div className="border-t border-[var(--border-subtle)] bg-[rgba(250,248,245,0.98)] px-5 pb-6 pt-3 lg:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-raised)]"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                <Button variant="ghost" href="/auth/sign-in?returnTo=/home" className="w-full">
                  Sign in
                </Button>
                <Button variant="primary" href="/discover" className="w-full" onClick={() => setMenuOpen(false)}>
                  Explore beauty services
                </Button>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main>
        {/* 1 HERO */}
        <section className="border-b border-[var(--border-subtle)]">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-12 lg:py-20">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">
                <span className="h-px w-7 bg-[var(--color-clay)]" aria-hidden="true" />
                Kenyan beauty marketplace
              </p>
              <h1 className="mt-5 font-display text-[clamp(2.6rem,8vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
                Your next look <em className="font-medium italic text-[var(--color-clay-text)]">starts here.</em>
              </h1>
              <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                Discover beauty services, compare listed prices, and connect with salons and independent
                professionals across Kenya. Clear profiles, honest expectations.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button variant="primary" size="lg" href="/discover">
                  <span className="hidden min-[400px]:inline">Explore beauty services</span>
                  <span className="min-[400px]:hidden">Explore</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="accent" size="lg" href="/auth/sign-up">
                  Create your account
                </Button>
              </div>
              <div className="mt-7 flex flex-wrap gap-2.5">
                {["Braids & natural hair", "Barbers", "Nails", "Makeup artists", "Salons"].map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--color-white)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-clay)]" aria-hidden="true" />
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Illustrative product preview */}
            <div className="relative min-w-0">
              <div className="relative mx-auto w-full max-w-[400px] overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--color-white)] shadow-[0_36px_72px_rgba(29,29,27,0.14)]">
                <div className="sample-banner flex items-center gap-2 bg-[var(--color-ink)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-white)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-clay)]" aria-hidden="true" />
                  Illustrative preview · sample data
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3.5">
                  <span className="font-display text-base font-bold">STYLD</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-clay-text)]">Nairobi</span>
                </div>
                <div className="mx-3.5 mt-3 flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-page)] px-3.5 py-2.5 text-xs text-[var(--text-muted)]">
                  Search salons, services, professionals…
                </div>
                <div className="scroll-row mx-3.5 mt-3 gap-2 pb-3">
                  {["Hair", "Nails", "Lashes", "Makeup", "Spa"].map((c, i) => (
                    <span
                      key={c}
                      className={`flex-none rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                        i === 0
                          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-white)]"
                          : "border-[var(--border-subtle)] bg-[var(--color-white)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <p className="px-3.5 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Sample discovery feed
                </p>
                <div className="grid gap-3 px-3.5 pb-3.5">
                  {previewCards.map((card) => (
                    <div key={card.name} className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] p-3">
                      <div className="relative h-14 w-14 flex-none overflow-hidden rounded-xl">
                        <Image src={card.img} alt="" fill sizes="56px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold">{card.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{card.meta}</p>
                      </div>
                      <p className="flex-none text-xs font-bold text-[var(--color-clay-text)]">{card.price}</p>
                    </div>
                  ))}
                </div>
                <div className="mx-3.5 mb-3.5 flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-clay)] bg-[rgba(192,160,144,0.1)] px-3.5 py-3 text-[11px] text-[var(--text-secondary)]">
                  <b className="text-[var(--color-ink)]">Plan:</b> preview appointment choices. Booking requests are coming soon.
                </div>
              </div>
              <div className="absolute -bottom-4 left-2 h-16 w-16 overflow-hidden rounded-full border-4 border-[var(--color-white)] shadow-[0_14px_30px_rgba(29,29,27,0.2)] sm:left-6">
                <Image
                  src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=160&q=70"
                  alt="Illustrative portrait"
                  fill
                  sizes="64px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2 DISCOVERY RAIL */}
        <section id="discover" className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-12">
            <div className="mb-9 max-w-[640px]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">Beauty discovery</p>
              <h2 className="mt-3 font-display text-[clamp(1.75rem,4.4vw,2.9rem)] font-semibold leading-[1.06] tracking-[-0.02em]">
                Explore what you can <em className="font-medium italic text-[var(--color-clay-text)]">plan today.</em>
              </h2>
              <p className="mt-3.5 text-[15px] text-[var(--text-secondary)]">
                Real categories and listed prices. Final photography is in progress.
              </p>
            </div>
            <div className="scroll-row gap-4 pb-2.5">
              {categories.map((cat) => (
                <article
                  key={cat.id}
                  className="w-[230px] flex-none snap-start overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--color-white)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="relative h-[150px] bg-[var(--color-clay)]">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 230px"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="illustrative-tile absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[var(--bg-page)] px-3 text-center">
                        <Sparkles aria-hidden="true" className="h-5 w-5 text-[var(--color-clay-text)]" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">{cat.cat}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Image in progress</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-clay-text)]">{cat.cat}</p>
                    <h3 className="mt-1 font-display text-lg font-semibold">{cat.name}</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{cat.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 3 INSIDE STYLD */}
        <section id="inside" className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-12">
            <div className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--color-white)] p-7 sm:p-9">
              <div className="mx-auto mb-8 max-w-[640px] text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">Inside Styld</p>
                <h2 className="mt-3 font-display text-[clamp(1.75rem,4.4vw,2.9rem)] font-semibold leading-[1.06] tracking-[-0.02em]">
                  Explore the <em className="font-medium italic text-[var(--color-clay-text)]">STYLD experience.</em>
                </h2>
                <p className="mt-3.5 text-[15px] text-[var(--text-secondary)]">
                  Illustrative sample data. Not real providers, reviews, or live availability.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="min-w-0 overflow-hidden rounded-[20px] border border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-page)] px-4 py-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Sample profile</span>
                    <span className="h-2 w-2 rounded-full bg-[var(--color-sage)]" aria-hidden="true" />
                  </div>
                  <div className="grid gap-3 p-4">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-[var(--color-ink)] font-display text-2xl font-semibold text-[var(--color-white)]">
                        SP
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold">Sample Professional</p>
                        <p className="text-xs text-[var(--text-muted)]">Makeup Artist · Nairobi</p>
                        <p className="mt-1 text-[13px] font-bold text-[var(--color-clay-text)]">From KSh 2,500</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] px-3.5 py-3">
                      <p className="min-w-0 text-[13px] font-semibold">
                        Soft glam <span className="block text-[11px] font-normal text-[var(--text-muted)]">1.5 hrs · at your location</span>
                      </p>
                      <p className="flex-none text-sm font-bold text-[var(--color-clay-text)]">KSh 3,000</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] px-3.5 py-3">
                      <p className="min-w-0 text-[13px] font-semibold">
                        Bridal makeup <span className="block text-[11px] font-normal text-[var(--text-muted)]">2 hrs · trial included</span>
                      </p>
                      <p className="flex-none text-sm font-bold text-[var(--color-clay-text)]">KSh 8,500</p>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-[20px] border border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-page)] px-4 py-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Booking preview</span>
                    <span className="h-2 w-2 rounded-full bg-[var(--color-sage)]" aria-hidden="true" />
                  </div>
                  <div className="grid gap-3 p-4">
                    <div className="rounded-2xl border border-dashed border-[var(--color-clay)] bg-[rgba(192,160,144,0.1)] p-3.5">
                      {[
                        { n: "1", text: "Choose a time that suits you." },
                        { n: "2", text: "Preview the appointment choices." },
                        { n: "3", text: "Coming soon: send a booking request." },
                      ].map((s) => (
                        <p key={s.n} className="flex items-center gap-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--color-ink)] text-[10px] font-bold text-[var(--color-white)]">
                            {s.n}
                          </span>
                          <span><b className="text-[var(--color-ink)]">{s.text.split(":")[0]}</b>{s.text.includes(":") ? `: ${s.text.split(":").slice(1).join(":")}` : ""}</span>
                        </p>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] px-3.5 py-3">
                      <p className="min-w-0 text-[13px] font-semibold">
                        Request status <span className="block text-[11px] font-normal text-[var(--text-muted)]">You will see updates here</span>
                      </p>
                      <p className="flex-none text-sm font-bold text-[var(--color-clay-text)]">Preview</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] px-3.5 py-3">
                      <p className="min-w-0 text-[13px] font-semibold">
                        Payments <span className="block text-[11px] font-normal text-[var(--text-muted)]">Not available yet</span>
                      </p>
                      <p className="flex-none text-sm font-bold text-[var(--color-clay-text)]">—</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 ROLES */}
        <section id="roles" className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-12">
            <div className="mx-auto mb-9 max-w-[640px] text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">Who Styld is for</p>
              <h2 className="mt-3 font-display text-[clamp(1.75rem,4.4vw,2.9rem)] font-semibold leading-[1.06] tracking-[-0.02em]">
                One platform, <em className="font-medium italic text-[var(--color-clay-text)]">three ways in.</em>
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <article
                    key={role.id}
                    className="flex flex-col rounded-[26px] border border-[var(--border-subtle)] bg-[var(--color-white)] p-7 transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] text-xl">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-display text-2xl font-semibold">{role.title}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{role.copy}</p>
                    <ul className="mt-4 mb-6 grid gap-2">
                      {role.highlights.map((h) => (
                        <li key={h} className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                          <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--color-sage)]" aria-hidden="true" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      <Button variant={role.id === "client" ? "primary" : role.id === "salon" ? "accent" : "ghost"} className="w-full" href={role.href}>
                        {role.cta}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5 TRUST (dark editorial band) */}
        <section id="trust" className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-12">
            <div className="rounded-[30px] bg-[var(--color-ink)] p-9 text-[var(--color-white)] sm:p-12">
              <div className="mx-auto mb-8 max-w-[640px] text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-clay)]">Trust &amp; transparency</p>
                <h2 className="mt-3 font-display text-[clamp(1.75rem,4.4vw,2.9rem)] font-semibold leading-[1.06] tracking-[-0.02em]">
                  Honest about <em className="font-medium italic text-[var(--color-clay)]">where we are.</em>
                </h2>
                <p className="mt-3.5 text-[15px] text-[rgba(253,247,242,0.72)]">
                  No inflated claims. Here is exactly what Styld does today, and what is still being built.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {trust.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div key={t.title} className="rounded-[20px] border border-[rgba(253,247,242,0.12)] bg-[rgba(253,247,242,0.04)] p-6">
                      <Icon className="h-6 w-6 text-[var(--color-clay)]" aria-hidden="true" />
                      <h4 className="mt-3 font-display text-xl font-semibold text-[var(--color-white)]">{t.title}</h4>
                      <p className="mt-2.5 text-[13px] leading-relaxed text-[rgba(253,247,242,0.7)]">{t.copy}</p>
                      <span className="mt-4 inline-block rounded-full border border-[rgba(192,160,144,0.4)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-clay)]">
                        {t.tag}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 6 HOW IT WORKS (3 steps) */}
        <section id="how" className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-12">
            <div className="mb-9 max-w-[640px]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">How it works</p>
              <h2 className="mt-3 font-display text-[clamp(1.75rem,4.4vw,2.9rem)] font-semibold leading-[1.06] tracking-[-0.02em]">
                Three simple, <em className="font-medium italic text-[var(--color-clay-text)]">honest steps.</em>
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.number} className="relative rounded-[20px] border border-[var(--border-subtle)] bg-[var(--color-white)] p-6">
                  {i < steps.length - 1 ? (
                    <span className="absolute right-5 top-6 text-lg text-[var(--color-clay)]" aria-hidden="true">→</span>
                  ) : null}
                  <p className="font-display text-sm font-semibold tracking-[0.08em] text-[var(--color-clay-text)]">{step.number}</p>
                  <h5 className="mt-3.5 text-lg font-bold">{step.title}</h5>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{step.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7 INSPIRATION GALLERY */}
        <section className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-12">
            <div className="mx-auto mb-9 max-w-[640px] text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">Inspiration</p>
              <h2 className="mt-3 font-display text-[clamp(1.75rem,4.4vw,2.9rem)] font-semibold leading-[1.06] tracking-[-0.02em]">
                Real looks, <em className="font-medium italic text-[var(--color-clay-text)]">real texture.</em>
              </h2>
              <p className="mt-3.5 text-[15px] text-[var(--text-secondary)]">
                Illustrative inspiration. Authentic Kenyan imagery is in progress.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {inspiration.map((img) => (
                <figure key={img.src} className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-[var(--color-clay)]">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(20,16,15,0.75)] to-transparent px-3 pb-2.5 pt-6 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-white)]">
                    Illustrative
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* 8 CLOSING CTA */}
        <section className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-12">
            <div className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--color-white)] px-6 py-12 text-center shadow-[0_30px_70px_rgba(29,29,27,0.08)] sm:px-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">Join Styld</p>
              <h2 className="mx-auto mt-3 max-w-[20ch] font-display text-[clamp(1.9rem,4.6vw,3.1rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
                Ready to <em className="font-medium italic text-[var(--color-clay-text)]">step in?</em>
              </h2>
              <p className="mx-auto mt-4 max-w-[50ch] text-[15px] text-[var(--text-secondary)]">
                Find beauty professionals, list your salon, or build your independent reputation. Start with a free account.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button variant="primary" size="lg" href="/auth/sign-up">
                  <span className="hidden min-[400px]:inline">Create your account</span>
                  <span className="min-[400px]:hidden">Join</span>
                </Button>
                <Button variant="ghost" size="lg" href="/discover">
                  <span className="hidden min-[400px]:inline">Explore beauty services</span>
                  <span className="min-[400px]:hidden">Explore</span>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 9 FOOTER */}
      <footer className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-5 px-5 py-9 sm:flex-row sm:items-center lg:px-12">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Styld home">
            <StyldLockup size={24} variant="default" />
          </Link>
          <nav className="flex flex-wrap gap-6" aria-label="Footer">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Contact", href: "/help" },
              { label: "Help", href: "/help" },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--color-ink)]">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-[var(--text-muted)]">© 2026 Styld · Kenya&apos;s trusted beauty access</p>
        </div>
      </footer>
    </div>
  );
}
