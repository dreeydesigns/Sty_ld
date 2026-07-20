import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Crown,
  Gem,
  LineChart,
  LockKeyhole,
  Sparkles,
  Star,
} from "lucide-react";

import { imageAssets, type VisualAsset } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Mobile Salon | Kenya's Beauty Marketplace",
  description:
    "Mobile Salon is a Kenyan beauty marketplace for clients, salons, and independent professionals.",
  openGraph: {
    title: "Mobile Salon | Beauty in your fingertips",
    description:
      "Discover trusted beauty help, list your salon, or grow as an independent professional.",
    type: "website",
  },
};

const proofStats = [
  ["4.9", "rating goal"],
  ["1,200+", "verified pros"],
  ["3", "launch cities"],
  ["5 taps", "booking path"],
];

const roleSections = [
  {
    label: "Clients",
    accent: "#C8284A",
    icon: Sparkles,
    title: "Beauty care, clearly arranged.",
    copy: "See the look, the price, and the slot before you book.",
    highlights: ["Verified first", "Visible prices", "Mobile options"],
    cta: "Find my beauty pro",
    href: "/signup/client",
    image: imageAssets.makeupArtist,
  },
  {
    label: "Salons",
    accent: "#BF8C2E",
    icon: Building2,
    title: "A salon page that works while you work.",
    copy: "Show your team, menu, portfolio, and availability in one polished place.",
    highlights: ["Team showcase", "Service menu", "Protected payouts"],
    cta: "List my salon",
    href: "/onboarding/salon",
    image: imageAssets.salonBraiding,
  },
  {
    label: "Professionals",
    accent: "#1A7A6B",
    icon: Crown,
    title: "Let your skill speak before you do.",
    copy: "Build a bookable profile with proof, pricing, and trusted ranking.",
    highlights: ["Portfolio first", "No rent barrier", "Verification boost"],
    cta: "Start as professional",
    href: "/onboarding/professional?role=professional",
    image: imageAssets.nails,
  },
];

const trustSignals = [
  { icon: BadgeCheck, title: "Verified first", copy: "Trusted accounts rise higher." },
  { icon: Star, title: "Quality-led", copy: "Reviews and completion shape ranking." },
  { icon: LockKeyhole, title: "Private by default", copy: "Phone details stay hidden early." },
  { icon: LineChart, title: "Built to earn", copy: "Fees, packages, and listing plans are ready." },
];

const steps = [
  { number: "01", title: "Choose", copy: "Salon or pro" },
  { number: "02", title: "Pick", copy: "Service or package" },
  { number: "03", title: "Time", copy: "Real availability" },
  { number: "04", title: "Review", copy: "Price and location" },
  { number: "05", title: "Confirm", copy: "Protected booking" },
];

export default function PublicLandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0F0A0D] text-[#FDF7F2]">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0F0A0D]/78 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <Link className="font-display text-2xl font-semibold text-[#FDF7F2]" href="/">
            <span className="text-[#C8284A]">Mobile</span> Salon
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="hidden rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white/82 transition hover:border-white/28 hover:text-white sm:inline-flex"
              href="/auth/sign-in?returnTo=/home"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C8284A] px-5 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(200,40,74,0.28)] transition hover:bg-[#E03460]"
              href="/auth/sign-up"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[minmax(0,0.52fr)_minmax(360px,0.48fr)] lg:px-6 lg:py-16">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C8284A]/70 to-transparent" />
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#BF8C2E]">
            Kenyan beauty marketplace
          </p>
          <h1 className="mt-7 font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] text-white sm:text-7xl lg:text-8xl">
            Beauty, booked
            <span className="block italic text-[#C8284A]">beautifully.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/68 sm:text-lg">
            For clients, salons, and professionals who want beauty booking to feel clear and trusted.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#C8284A] px-7 text-sm font-semibold text-white shadow-[0_20px_54px_rgba(200,40,74,0.32)] transition hover:bg-[#E03460]"
              href="/auth/sign-up"
            >
              Create my account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/12 px-7 text-sm font-semibold text-white/86 transition hover:border-white/30 hover:bg-white/6"
              href="/auth/sign-in?returnTo=/home"
            >
              I already have an account
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {roleSections.map((role) => (
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-white/24 hover:text-white"
                href={role.href}
                key={role.label}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: role.accent }} />
                {role.label}
              </Link>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-3 lg:hidden">
            <LandingVisualTile asset={imageAssets.braidsPortrait} badge="Client-first" title="See the beauty before the booking." />
          </div>
        </div>

        <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,0.56fr)_minmax(0,0.44fr)]">
          <LandingVisualTile asset={imageAssets.braidsPortrait} badge="Client-first" large title="See the beauty before the booking." />
          <div className="grid gap-4">
            <LandingVisualTile asset={imageAssets.salonBraiding} badge="Salons" title="Show the team, menu, and mood." />
            <LandingVisualTile asset={imageAssets.nails} badge="Professionals" title="Let portfolio proof do the talking." />
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-white/[0.035]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
          {proofStats.map(([value, label]) => (
            <div className="rounded-[24px] border border-white/8 bg-[#1A0F14] px-5 py-5" key={label}>
              <p className="font-display text-4xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-20 lg:px-6">
        {roleSections.map((role, index) => {
          const Icon = role.icon;

          return (
            <article
              className="grid overflow-hidden rounded-[40px] border border-white/8 bg-[#1A0F14] lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)]"
              key={role.label}
            >
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <div className="relative min-h-[320px]">
                  <Image
                    alt={role.image.alt}
                    className="object-cover"
                    fill
                    sizes="(max-width: 1024px) 100vw, 48vw"
                    src={role.image.url}
                    style={{ objectPosition: role.image.position }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A0D]/72 via-[#0F0A0D]/14 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3 rounded-[24px] border border-white/12 bg-black/25 px-4 py-3 backdrop-blur">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">{role.label}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{role.title}</p>
                    </div>
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: role.accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-6 sm:p-8 lg:p-10 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">{role.label}</p>
                <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  {role.title}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/66">{role.copy}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {role.highlights.map((highlight) => (
                    <span
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72"
                      key={highlight}
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
                <Link
                  className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition hover:brightness-110"
                  href={role.href}
                  style={{ backgroundColor: role.accent }}
                >
                  {role.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
          <div className="rounded-[38px] border border-white/8 bg-[#1A0F14] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#BF8C2E]">Built on trust</p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-white">
                Show the beauty.
                <span className="block text-[#C8284A]">Let the platform carry the proof.</span>
              </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {trustSignals.map((signal) => {
              const Icon = signal.icon;

              return (
                <div className="rounded-[30px] border border-white/8 bg-white/[0.045] p-5" key={signal.title}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C8284A]/16 text-[#C8284A]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-xl font-semibold text-white">{signal.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/62">{signal.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-6">
        <div className="rounded-[42px] border border-white/8 bg-[#FDF7F2] p-6 text-[#0F0A0D] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.3fr)_minmax(0,0.7fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B6070]">How it works</p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight">
                A calm, fast path.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {steps.map((step, index) => (
                <div
                  className="rounded-[24px] border border-[#0F0A0D]/10 bg-white p-4 shadow-[0_14px_34px_rgba(15,10,13,0.06)]"
                  key={step.number}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                      index === steps.length - 1 ? "bg-[#C8284A] text-white" : "border border-[#C8284A]/40 text-[#C8284A]"
                    }`}
                  >
                    {step.number}
                  </span>
                  <p className="mt-4 text-base font-semibold leading-6">{step.title}</p>
                  <p className="mt-1 text-sm text-[#8B6070]">{step.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 text-center lg:px-6">
        <div className="rounded-[44px] border border-white/10 bg-[linear-gradient(135deg,#1A0F14,#2A121D_52%,#0F0A0D)] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.32)] sm:p-12">
          <Gem className="mx-auto h-9 w-9 text-[#BF8C2E]" />
          <h2 className="mt-5 font-display text-5xl font-semibold leading-tight text-white">
            Ready to step in?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/66">Book, list, or grow from one clear starting point.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C8284A] px-7 text-sm font-semibold text-white transition hover:bg-[#E03460]"
              href="/auth/sign-up"
            >
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 px-7 text-sm font-semibold text-white/82 transition hover:border-white/32 hover:text-white"
              href="/auth/sign-in?returnTo=/home"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-white/52 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <p className="font-display text-xl text-white">
            <span className="text-[#C8284A]">Mobile</span> Salon
          </p>
          <div className="flex flex-wrap gap-4">
            <Link className="hover:text-white" href="/privacy">Privacy</Link>
            <Link className="hover:text-white" href="/terms">Terms</Link>
            <Link className="hover:text-white" href="/help">Contact</Link>
            <Link className="hover:text-white" href="/help">Help</Link>
          </div>
          <p>Copyright 2026 Mobile Salon. Beauty in your fingertips.</p>
        </div>
      </footer>
    </main>
  );
}

function LandingVisualTile({
  asset,
  badge,
  title,
  large = false,
}: {
  asset: VisualAsset;
  badge: string;
  title: string;
  large?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[34px] border border-white/10 ${large ? "min-h-[520px]" : "min-h-[252px]"}`}>
      <Image
        alt={asset.alt}
        className="object-cover"
        fill
        priority={large}
        sizes={large ? "(max-width: 1024px) 100vw, 28vw" : "(max-width: 1024px) 100vw, 18vw"}
        src={asset.url}
        style={{ objectPosition: asset.position }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A0D]/78 via-[#0F0A0D]/18 to-transparent" />
      <div className="absolute inset-x-4 bottom-4 rounded-[28px] border border-white/12 bg-black/28 p-4 backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/58">{badge}</p>
        <p className="mt-2 max-w-[18rem] font-display text-2xl leading-tight text-white">{title}</p>
      </div>
    </div>
  );
}
