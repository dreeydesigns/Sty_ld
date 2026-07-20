"use client";

import { useEffect, useState } from "react";
import {
  BarChart2,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Coins,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Users,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { CTAButton } from "@/components/marketplace-ui";
import { APP_SESSION_EVENT, readAppSession, type AppUserSession } from "@/lib/client-session";
import { cn } from "@/lib/utils";

// ─── Guide content ────────────────────────────────────────────────────────────

const CLIENT_GUIDE = [
  { icon: Search, title: "Find", body: "Search by service, neighbourhood, or name. Use filters to narrow down. Browse salons or professionals." },
  { icon: CalendarDays, title: "Book", body: "Tap 'Book Now' on any card. Pick your service, date, time, and location. Confirm and pay." },
  { icon: ShieldCheck, title: "Pay safely", body: "You pay upfront but the money is held securely until your service is done. You are protected." },
  { icon: Star, title: "Review", body: "After your appointment: rate your experience. Your review helps other women make better choices." },
  { icon: ShoppingBag, title: "Shop", body: "Browse beauty products on Counter. Add to cart. Get delivery or arrange pickup with the seller." },
];

const CLIENT_SAFETY = [
  { emoji: "🔒", title: "Never pay outside the app", body: "If anyone asks you to pay via WhatsApp or cash — report it immediately." },
  { emoji: "📍", title: "Share your booking", body: "Tap 'Share booking' before a mobile appointment to send details to a trusted contact." },
  { emoji: "🚩", title: "Report anything wrong", body: "See something that doesn't feel right? Three-tap report on any profile or product." },
];

const PRO_GUIDE = [
  { icon: UserRound, title: "Create your profile", body: "Sign up as a Professional. Add your services, prices, portfolio photos, and service area." },
  { icon: CheckCircle2, title: "Get verified", body: "Submit your ID to earn the Verified badge. Verified professionals rank higher and get more bookings." },
  { icon: CalendarDays, title: "Manage bookings", body: "View incoming requests in your dashboard. Confirm, reschedule, or decline. Mark complete when done." },
  { icon: Coins, title: "Get paid", body: "Payment is held securely until you complete the service. Funds release to your M-Pesa automatically." },
  { icon: BarChart2, title: "Grow your reputation", body: "Each completed booking builds your rating. More bookings = better placement in search results." },
];

const PRO_RULES = [
  { title: "List the products you use", body: "Under each service: add the products you use. Clients can buy them from Counter when booking." },
  { title: "Set your preference clearly", body: "Tell clients if you supply products, they should bring their own, or either works." },
  { title: "Respond quickly", body: "Response time affects your ranking. Faster replies = better placement in search." },
];

const SALON_GUIDE = [
  { icon: Building2, title: "Create your salon", body: "Sign up as a Salon. Add your team, services, location, operating hours, and portfolio." },
  { icon: CheckCircle2, title: "Get verified", body: "Submit business registration documents. Verified salons rank higher and build client trust faster." },
  { icon: Users, title: "Manage your team", body: "Add team members to your salon profile. Each team member can have their own specialties and portfolio." },
  { icon: CalendarDays, title: "Accept bookings", body: "Bookings appear in your dashboard. Confirm, assign to a team member, and mark complete." },
  { icon: Coins, title: "Get paid", body: "Payment releases to your M-Pesa after each completed service. Commission is deducted automatically." },
];

const FAQS = [
  {
    q: "How does payment work?",
    a: "You pay when you book. The money is held safely until your service is confirmed complete. You are never charged for a no-show by the professional.",
  },
  {
    q: "Is my personal information safe?",
    a: "Your phone number and address are never shared with a professional until your booking is confirmed — and only 1 hour before your appointment.",
  },
  {
    q: "How do I know a professional is genuine?",
    a: "Verified profiles have passed an ID check. Look for the green Verified badge. Unverified profiles are shown below verified ones in search.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. Free cancellation up to 24 hours before. Cancel within 2–24 hours: 50% refund. Cancel less than 2 hours before: no refund (professional has already prepared).",
  },
  {
    q: "What is Counter?",
    a: "Counter is the in-app beauty product shop. Browse and buy products from verified sellers. Products can be linked to services you are booking.",
  },
  {
    q: "How do I become a seller?",
    a: "Register as a Shop. Complete business verification. Choose a subscription plan. Then list your products.",
  },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function IconSection({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border border-[var(--ms-border)] bg-white p-5 text-center shadow-[0_4px_12px_rgba(13,27,42,0.05)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ms-petal)] text-[var(--ms-rose)]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-semibold text-[var(--ms-navy)]">{title}</p>
      <p className="text-xs leading-5 text-[var(--ms-mauve)]">{body}</p>
    </div>
  );
}

function SafetyCard({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_4px_12px_rgba(13,27,42,0.05)]">
      <p className="text-2xl">{emoji}</p>
      <p className="mt-2 font-semibold text-[var(--ms-navy)]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">{body}</p>
    </div>
  );
}

function RuleRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] bg-[var(--ms-soft-bg)] px-4 py-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1A7A6B]" />
      <div>
        <p className="text-sm font-semibold text-[var(--ms-navy)]">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--ms-mauve)]">{body}</p>
      </div>
    </div>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--ms-border)] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <p className="font-semibold text-[var(--ms-navy)]">{q}</p>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--ms-mauve)] transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-[var(--ms-border)] px-5 py-4">
          <p className="text-sm leading-6 text-[var(--ms-mauve)]">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Guide Page ───────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState<"clients" | "professionals" | "salons">("clients");
  const [session, setSession] = useState<AppUserSession | null>(null);

  useEffect(() => {
    function sync() { setSession(readAppSession()); }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(APP_SESSION_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(APP_SESSION_EVENT, sync);
    };
  }, []);

  const isGuest = !session || session.role === "guest";

  return (
    <AppShell currentNav="guide" roleMode="salons">
      <div className="mx-auto max-w-5xl space-y-8 px-4 pb-24 pt-4">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-[var(--ms-navy)] sm:text-4xl">How it works</h1>
          <p className="mt-2 text-sm text-[var(--ms-mauve)]">Everything you need to know in one place.</p>
        </div>

        {/* Tab selector */}
        <div className="inline-flex rounded-full border border-[var(--ms-border)] bg-white p-1">
          {(["clients", "professionals", "salons"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold capitalize transition",
                activeTab === tab ? "bg-[var(--ms-plum)] text-white" : "text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]",
              )}
            >
              For {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Clients tab ─────────────────────────────────────────────── */}
        {activeTab === "clients" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {CLIENT_GUIDE.map((s) => <IconSection key={s.title} icon={s.icon} title={s.title} body={s.body} />)}
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Safety tips</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {CLIENT_SAFETY.map((s) => <SafetyCard key={s.title} {...s} />)}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <CTAButton href="/book?rush=true">Book Now</CTAButton>
              <CTAButton href="/home" variant="outline">Browse</CTAButton>
            </div>
          </div>
        )}

        {/* ── Professionals tab ─────────────────────────────────────────── */}
        {activeTab === "professionals" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {PRO_GUIDE.map((s) => <IconSection key={s.title} icon={s.icon} title={s.title} body={s.body} />)}
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Key rules</p>
              <div className="space-y-2">
                {PRO_RULES.map((r) => <RuleRow key={r.title} {...r} />)}
              </div>
            </div>
            {isGuest && <CTAButton href="/onboarding/professional">Join as a Professional</CTAButton>}
          </div>
        )}

        {/* ── Salons tab ─────────────────────────────────────────────── */}
        {activeTab === "salons" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {SALON_GUIDE.map((s) => <IconSection key={s.title} icon={s.icon} title={s.title} body={s.body} />)}
            </div>
            {isGuest && <CTAButton href="/onboarding/salon">List your salon</CTAButton>}
          </div>
        )}

        {/* ── FAQ (all tabs) ─────────────────────────────────────────── */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Common questions</p>
          <div className="space-y-2">
            {FAQS.map((faq) => <FaqRow key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
