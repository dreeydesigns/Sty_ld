"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  Droplets,
  Gem,
  Heart,
  Leaf,
  Sparkles,
  Star,
  Waves,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { SalonCard, ProfessionalCard } from "@/components/marketplace-ui";
import { salons, professionals } from "@/lib/site-data";
import { cn } from "@/lib/utils";

// ─── Enriched package data ─────────────────────────────────────────────────────

const PACKAGES = [
  {
    id: "bridal",
    name: "Bridal Package",
    icon: Gem,
    color: "#BF8C2E",
    colorLight: "rgba(191,140,46,0.10)",
    services: ["Hair", "Make-up", "Nails", "Skin"],
    price: "KES 18,000",
    duration: "Full day",
    badge: null,
    image: "https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop",
    vibe: "Your most important day deserves your most beautiful self.",
    experience:
      "From the first consultation to the final touch, your bridal prep is handled entirely — hair, make-up, nails, and skincare aligned to your vision. This is not a service. It is a ceremony before the ceremony. We make sure you walk in feeling like exactly who you are.",
    whatToExpect: [
      "Pre-bridal consultation + trial session",
      "Full-day dedicated artist",
      "Hair, make-up, nails & skin in one booking",
      "Bridal emergency kit included",
    ],
    occasions: ["Wedding day", "Traditional ceremony", "White wedding", "Engagement photos"],
  },
  {
    id: "birthday",
    name: "Birthday Glow",
    icon: Star,
    color: "#C8284A",
    colorLight: "rgba(200,40,74,0.10)",
    services: ["Hair", "Nails", "Make-up"],
    price: "KES 8,500",
    duration: "4–6 hrs",
    badge: "Popular",
    image: "https://images.pexels.com/photos/3738359/pexels-photo-3738359.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop",
    vibe: "Because you deserve to be celebrated — loudly.",
    experience:
      "Your birthday is the one day it is entirely, unapologetically about you. Show up glowing — hair that turns heads, nails that hold their own, make-up that says yes, I know I look good. Walk into any room knowing you are the moment.",
    whatToExpect: [
      "Hair wash, treatment & style",
      "Nail design of your choice",
      "Full glam or soft glow make-up",
      "Photos guaranteed to slay",
    ],
    occasions: ["Birthday", "21st celebration", "Milestone birthday", "Birthday dinner"],
  },
  {
    id: "self-care",
    name: "Self-Care Sunday",
    icon: Leaf,
    color: "#1A7A6B",
    colorLight: "rgba(26,122,107,0.10)",
    services: ["Massage", "Facial", "Nail care"],
    price: "KES 9,200",
    duration: "Full day",
    badge: null,
    image: "https://images.pexels.com/photos/3997990/pexels-photo-3997990.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop",
    vibe: "Rest is a ritual. You have earned this.",
    experience:
      "Switch your phone off. A full day of massage, facial, and nail care designed to restore what the week took from you. No rush. No noise. Just you — exactly as you need to be. This is not a treat, this is maintenance for someone who matters.",
    whatToExpect: [
      "Full body or back & neck massage",
      "Deep cleanse & glow facial",
      "Nail care + cuticle treatment",
      "Optional aromatherapy add-on",
    ],
    occasions: ["Self-care day", "Mental health reset", "Post-exam treat", "Burnout recovery"],
  },
  {
    id: "baby-shower",
    name: "Baby Shower",
    icon: Heart,
    color: "#8B5CF6",
    colorLight: "rgba(139,92,246,0.10)",
    services: ["Hair", "Make-up", "Nails"],
    price: "KES 7,800",
    duration: "3–4 hrs",
    badge: null,
    image: "https://images.pexels.com/photos/3912572/pexels-photo-3912572.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop",
    vibe: "Glow different when you are welcoming a new chapter.",
    experience:
      "Whether it is your shower or you are celebrating someone else's new beginning, you deserve to arrive radiant. Soft, careful, and joyful — hair, nails, and make-up styled to match the tenderness of the moment.",
    whatToExpect: [
      "Soft glamour or natural make-up",
      "Protective & gentle hair styling",
      "Nail design for the occasion",
      "Pregnancy-safe products available on request",
    ],
    occasions: ["Baby shower", "Gender reveal", "Expectant mother treat", "Bump photoshoot"],
  },
  {
    id: "corporate",
    name: "Corporate Event",
    icon: Briefcase,
    color: "#EA580C",
    colorLight: "rgba(234,88,12,0.10)",
    services: ["Make-up", "Hair styling"],
    price: "KES 5,500",
    duration: "2–3 hrs",
    badge: null,
    image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop",
    vibe: "Command the room the moment you walk in.",
    experience:
      "Professional does not mean plain. This package gives you polished, camera-ready make-up and structured hair for events where every impression is intentional. You already belong in that room — now you look the part too.",
    whatToExpect: [
      "Long-wear, camera-ready make-up",
      "Structured blowout or updo",
      "Touch-up kit included",
      "Quick turnaround available",
    ],
    occasions: ["Corporate event", "Product launch", "Business dinner", "Award ceremony"],
  },
  {
    id: "seasonal",
    name: "Seasonal Special",
    icon: CalendarDays,
    color: "#C8284A",
    colorLight: "rgba(200,40,74,0.08)",
    services: ["Varies by season"],
    price: "KES 6,000",
    duration: "3–5 hrs",
    badge: "Limited",
    image: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop",
    vibe: "Every season has a ritual. This one is yours.",
    experience:
      "Curated quarterly to match the mood of the moment — whether that is a Valentine's softness, Eid radiance, festive boldness, or New Year's fresh start. Updated every three months so it always feels current, intentional, and exactly right for where you are.",
    whatToExpect: [
      "Season-specific curated look",
      "Trending colour palettes & techniques",
      "Surprise add-on each quarter",
      "Limited slots — book early",
    ],
    occasions: ["Valentine's Day", "Eid celebration", "Christmas", "New Year's Eve"],
  },
  {
    id: "locs-starter",
    name: "Locs Starter",
    icon: Waves,
    color: "#1A7A6B",
    colorLight: "rgba(26,122,107,0.10)",
    services: ["Locs installation", "Consultation"],
    price: "KES 4,500",
    duration: "4–8 hrs",
    badge: null,
    image: "https://images.pexels.com/photos/3993398/pexels-photo-3993398.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop",
    vibe: "The beginning of a lifelong relationship with your hair.",
    experience:
      "Starting locs is a commitment — to your hair, your patience, and your identity. The first session is more than an installation. It is a conversation about who you are and where your hair can take you. We start right so the journey stays beautiful.",
    whatToExpect: [
      "45-minute consultation & hair health check",
      "First locs installation session",
      "Scalp care treatment",
      "Personalised aftercare guide + product recs",
    ],
    occasions: ["New locs journey", "Natural hair transition", "Hair reset", "Self-rediscovery"],
  },
  {
    id: "natural-reset",
    name: "Natural Hair Reset",
    icon: Droplets,
    color: "#8B5CF6",
    colorLight: "rgba(139,92,246,0.10)",
    services: ["Deep treatment", "Style", "Aftercare guide"],
    price: "KES 3,800",
    duration: "2–3 hrs",
    badge: null,
    image: "https://images.pexels.com/photos/3993392/pexels-photo-3993392.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop",
    vibe: "Your curls remember what they are capable of.",
    experience:
      "Your natural hair is not the problem — it just needs to be heard. A deep conditioning treatment, style session, and full aftercare guide to help your curls show up the way they were always meant to. Come in stressed. Leave luminous.",
    whatToExpect: [
      "Deep conditioning & protein treatment",
      "Detangling & natural style session",
      "Personalised aftercare plan",
      "Product recommendations for your curl type",
    ],
    occasions: ["Hair reset", "Pre-holiday prep", "Post-relaxer detox", "Healthy hair journey"],
  },
];

// ─── Occasion pill ─────────────────────────────────────────────────────────────

function OccasionPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ms-rose)]/30 bg-[var(--ms-petal)] px-3 py-1.5 text-xs font-semibold text-[var(--ms-plum)]">
      <Sparkles className="h-3 w-3 text-[var(--ms-rose)]" />
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PackageDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const pkg = PACKAGES.find((p) => p.id === id);
  const [providerType, setProviderType] = useState<"salons" | "professionals">("salons");

  const displaySalons = salons.slice(0, 6);
  const displayPros = professionals.slice(0, 6);

  const Icon = pkg?.icon;

  if (!pkg) {
    return (
      <AppShell currentNav="explore" roleMode="salons">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-4">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ms-mauve)] hover:text-[var(--ms-navy)] transition"
          >
            ← Packages
          </Link>
          <p className="mt-8 text-center text-[var(--ms-mauve)]">Package not found.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentNav="explore" roleMode="salons">
      <div className="mx-auto max-w-7xl space-y-5 px-4 pb-24 pt-4">

        {/* Back link */}
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ms-mauve)] hover:text-[var(--ms-navy)] transition"
        >
          ← Packages
        </Link>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[28px] shadow-[0_8px_32px_rgba(13,27,42,0.14)]">
          <img
            src={pkg.image}
            alt={pkg.name}
            className="h-72 w-full object-cover sm:h-80"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,27,42,0.08)_0%,rgba(13,27,42,0.72)_100%)]" />

          {/* Overlaid content */}
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                {pkg.badge && (
                  <span className="mb-2 inline-block rounded-full bg-[var(--ms-rose)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                    {pkg.badge}
                  </span>
                )}
                <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  {pkg.name}
                </h1>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-white/80 italic">
                  {pkg.vibe}
                </p>
              </div>
              {Icon && (
                <span
                  className="hidden shrink-0 sm:flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 backdrop-blur-sm"
                  style={{ backgroundColor: `${pkg.color}33` }}
                >
                  <Icon className="h-7 w-7 text-white" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Perfect for ───────────────────────────────────────────────── */}
        <div className="rounded-[24px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_4px_12px_rgba(13,27,42,0.05)]">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">
            Perfect for
          </p>
          <div className="flex flex-wrap gap-2">
            {pkg.occasions.map((o) => (
              <OccasionPill key={o} label={o} />
            ))}
          </div>
        </div>

        {/* ── The experience ────────────────────────────────────────────── */}
        <div className="rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">
            The experience
          </p>
          <p className="text-sm leading-[1.75] text-[var(--ms-navy)]">{pkg.experience}</p>
        </div>

        {/* ── What to expect ────────────────────────────────────────────── */}
        <div className="rounded-[24px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_4px_12px_rgba(13,27,42,0.05)]">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">
            What to expect
          </p>
          <ul className="space-y-2.5">
            {pkg.whatToExpect.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold"
                  style={{ backgroundColor: pkg.color }}
                >
                  ✓
                </span>
                <span className="text-sm text-[var(--ms-navy)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Price, duration, services + CTA ───────────────────────────── */}
        <div className="rounded-[24px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_4px_12px_rgba(13,27,42,0.05)] space-y-4">

          {/* Stats row */}
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">Duration</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--ms-navy)]">{pkg.duration}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">Starting from</p>
              <p className="mt-0.5 text-base font-semibold text-[var(--ms-navy)]">{pkg.price}</p>
            </div>
          </div>

          {/* Included services */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">Includes</p>
            <div className="flex flex-wrap gap-2">
              {pkg.services.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ms-navy)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Book Now CTA */}
          <Link
            href={`/book?rush=true&packageId=${id}&serviceIds=${encodeURIComponent(pkg.services.join(","))}`}
            className="block w-full rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] py-3.5 text-center text-sm font-semibold text-white shadow-[0_4px_16px_rgba(214,51,108,0.30)] transition hover:brightness-110"
          >
            Book this package
          </Link>
        </div>

        {/* ── Provider toggle ───────────────────────────────────────────── */}
        <div>
          <p className="mb-3 text-sm font-semibold text-[var(--ms-navy)]">Choose your provider</p>
          <div className="inline-flex rounded-full border border-[var(--ms-border)] bg-white p-1">
            <button
              type="button"
              onClick={() => setProviderType("salons")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition",
                providerType === "salons"
                  ? "bg-[var(--ms-plum)] text-white"
                  : "text-[var(--ms-mauve)]",
              )}
            >
              Book with a Salon
            </button>
            <button
              type="button"
              onClick={() => setProviderType("professionals")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition",
                providerType === "professionals"
                  ? "bg-[var(--ms-plum)] text-white"
                  : "text-[var(--ms-mauve)]",
              )}
            >
              Book with a Professional
            </button>
          </div>
        </div>

        {/* Provider grid */}
        {providerType === "salons" ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displaySalons.map((salon) => (
              <SalonCard key={salon.slug} salon={salon} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayPros.map((pro) => (
              <ProfessionalCard key={pro.slug} professional={pro} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
