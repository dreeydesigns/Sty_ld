"use client";

import Link from "next/link";
import { useEffect, useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Droplets,
  Gem,
  Hand,
  Heart,
  LayoutGrid,
  Leaf,
  List,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Star,
  Waves,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  SalonCard,
  ProfessionalCard,
  FilterDrawer,
  type FilterSection,
} from "@/components/marketplace-ui";
import { readAppSession } from "@/lib/client-session";
import { professionals, salons } from "@/lib/site-data";
import { rankProfessionals, rankSalons } from "@/lib/discovery-ranking";
import { cn } from "@/lib/utils";
import { ClientRatingFlow } from "@/components/service-session";
import { ErrorBoundary } from "@/components/error-boundary";

type DiscoverTab = "salons" | "professionals" | "services" | "packages";
type SortKey = "top-rated" | "nearest" | "price-low" | "earliest";

const PAGE_SIZE = 12;

// ─── Filter configs ───────────────────────────────────────────────────────────

const SALON_FILTERS: FilterSection[] = [
  { label: "Location", options: ["Kilimani", "Westlands", "South B", "Lavington", "Karen"] },
  { label: "Salon type", options: ["Hair Salon", "Beauty Spa", "Nail Bar", "Multi-service"] },
  { label: "Services", options: ["Hair", "Nails", "Make-up", "Skincare", "Massage", "Waxing"] },
  { label: "Verified only", options: ["Verified"] },
  { label: "Price range", options: ["Under Ksh 1,000", "Ksh 1,000–2,500", "Ksh 2,500–5,000", "Ksh 5,000+"] },
];

const PRO_FILTERS: FilterSection[] = [
  { label: "Location", options: ["Kilimani", "Karen", "Westlands", "South B", "Lavington"] },
  { label: "Service mode", options: ["Mobile", "In salon", "Both"] },
  { label: "Specialty", options: ["Bridal", "Natural Hair", "Nails", "Self-Care", "Short Hair & Shave", "Locs", "Make-up"] },
  { label: "Verified only", options: ["Verified"] },
  { label: "Price range", options: ["Under Ksh 1,000", "Ksh 1,000–2,500", "Ksh 2,500–5,000", "Ksh 5,000+"] },
  { label: "Availability", options: ["Today", "This week"] },
];

// ─── Services data ────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES = [
  { id: "hair", name: "Hair", icon: Waves, color: "#C8284A", colorLight: "rgba(200,40,74,0.08)", subcategories: ["Braiding", "Locs", "Weaves", "Relaxer", "Dye / Colour", "Wash & Go", "Cuts", "Natural Hair"], count: 48 },
  { id: "nails", name: "Nails", icon: Hand, color: "#8B5CF6", colorLight: "rgba(139,92,246,0.08)", subcategories: ["Gel Manicure", "Acrylic", "Nail Art", "Pedicure", "Nail Extensions"], count: 34 },
  { id: "makeup", name: "Make-up", icon: Sparkles, color: "#BF8C2E", colorLight: "rgba(191,140,46,0.08)", subcategories: ["Bridal", "Events", "Natural", "Glam", "Lashes"], count: 29 },
  { id: "skincare", name: "Skincare", icon: Leaf, color: "#1A7A6B", colorLight: "rgba(26,122,107,0.08)", subcategories: ["Facial", "Glow Treatment", "Acne Care", "Chemical Peel"], count: 22 },
  { id: "massage", name: "Massage", icon: Heart, color: "#EA580C", colorLight: "rgba(234,88,12,0.08)", subcategories: ["Full Body", "Back & Neck", "Relaxation", "Deep Tissue"], count: 18 },
  { id: "waxing", name: "Waxing", icon: Droplets, color: "#C8284A", colorLight: "rgba(200,40,74,0.06)", subcategories: ["Body Wax", "Facial Wax", "Brow Shaping"], count: 15 },
  { id: "threading", name: "Threading", icon: Scissors, color: "#8B5CF6", colorLight: "rgba(139,92,246,0.06)", subcategories: ["Brow Threading", "Upper Lip", "Full Face"], count: 12 },
  { id: "wellness", name: "Wellness", icon: Leaf, color: "#1A7A6B", colorLight: "rgba(26,122,107,0.06)", subcategories: ["Body Wrap", "Steam", "Hot Oil Treatment"], count: 11 },
  { id: "bridal", name: "Bridal", icon: Gem, color: "#BF8C2E", colorLight: "rgba(191,140,46,0.06)", subcategories: ["Full bridal preparation packages"], count: 9 },
  { id: "locs-braids", name: "Locs & Braids", icon: Waves, color: "#EA580C", colorLight: "rgba(234,88,12,0.06)", subcategories: ["Locs Installation", "Locs Maintenance", "Braiding"], count: 31 },
];

// ─── Packages data ────────────────────────────────────────────────────────────

const PACKAGES = [
  { id: "bridal", name: "Bridal Package", icon: Gem, color: "#BF8C2E", services: ["Hair", "Make-up", "Nails", "Skin"], price: "KES 18,000", duration: "Full day", description: "Your most important day deserves your most beautiful self.", image: "https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Wedding day" },
  { id: "birthday", name: "Birthday Glow", icon: Star, color: "#C8284A", services: ["Hair", "Nails", "Make-up"], price: "KES 8,500", duration: "4–6 hrs", description: "Because you deserve to be celebrated — loudly.", image: "https://images.pexels.com/photos/3738359/pexels-photo-3738359.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: "Popular" as string | null, occasion: "Birthday" },
  { id: "self-care", name: "Self-Care Sunday", icon: Leaf, color: "#1A7A6B", services: ["Massage", "Facial", "Nail care"], price: "KES 9,200", duration: "Full day", description: "Rest is a ritual. You have earned this.", image: "https://images.pexels.com/photos/3997990/pexels-photo-3997990.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Self-care day" },
  { id: "baby-shower", name: "Baby Shower", icon: Heart, color: "#8B5CF6", services: ["Hair", "Make-up", "Nails"], price: "KES 7,800", duration: "3–4 hrs", description: "Glow different when you are welcoming a new chapter.", image: "https://images.pexels.com/photos/3912572/pexels-photo-3912572.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Baby shower" },
  { id: "corporate", name: "Corporate Event", icon: Briefcase, color: "#EA580C", services: ["Make-up", "Hair styling"], price: "KES 5,500", duration: "2–3 hrs", description: "Command the room the moment you walk in.", image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Corporate event" },
  { id: "seasonal", name: "Seasonal Special", icon: CalendarDays, color: "#C8284A", services: ["Varies by season"], price: "KES 6,000", duration: "3–5 hrs", description: "Every season has a ritual. This one is yours.", image: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: "Limited" as string | null, occasion: "Valentine's Day" },
  { id: "locs-starter", name: "Locs Starter", icon: Waves, color: "#1A7A6B", services: ["Locs installation", "Consultation"], price: "KES 4,500", duration: "4–8 hrs", description: "The beginning of a lifelong relationship with your hair.", image: "https://images.pexels.com/photos/3993398/pexels-photo-3993398.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "New locs journey" },
  { id: "natural-reset", name: "Natural Hair Reset", icon: Droplets, color: "#8B5CF6", services: ["Deep treatment", "Style", "Aftercare guide"], price: "KES 3,800", duration: "2–3 hrs", description: "Your curls remember what they are capable of.", image: "https://images.pexels.com/photos/3993392/pexels-photo-3993392.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Hair reset" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();

  // Providers don't have a Discover page — send them to their home feed
  useEffect(() => {
    const session = readAppSession();
    if (session?.role === "professional" || session?.role === "salon") {
      router.replace("/home");
    }
  }, [router]);

  const [tab, setTab] = useState<DiscoverTab>("salons");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [sortBy] = useState<SortKey>("top-rated");
  const deferredSelected = useDeferredValue(selected);

  function toggle(value: string) {
    setSelected((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    setShown(PAGE_SIZE);
  }

  function switchTab(next: DiscoverTab) {
    setTab(next);
    setSelected([]);
    setShown(PAGE_SIZE);
    setExpandedCategory(null);
  }

  const filteredSalons = rankSalons(
    salons.filter((s) => {
      if (deferredSelected.length === 0) return true;
      return deferredSelected.every(
        (v) => s.location.includes(v) || s.categoryTags.includes(v) ||
          s.serviceIds.some((id) => id.includes(v.toLowerCase().replace(/\s+/g, "-"))) ||
          (v === "Verified" && s.verified),
      );
    }),
    sortBy,
  );

  const filteredPros = rankProfessionals(
    professionals.filter((p) => {
      if (deferredSelected.length === 0) return true;
      return deferredSelected.every(
        (v) => p.location.includes(v) || p.serviceMode === v ||
          p.specialty.includes(v) || p.identityAttributes.includes(v) ||
          (v === "Verified" && p.verified) ||
          (v === "Today" && p.nextAvailable?.toLowerCase().includes("today")),
      );
    }),
    sortBy,
  );

  const isPeopleTab = tab === "salons" || tab === "professionals";
  const results = tab === "salons" ? filteredSalons : filteredPros;
  const visible = results.slice(0, shown);
  const hasMore = shown < results.length;

  const subtitleMap: Record<DiscoverTab, string> = {
    salons: `${filteredSalons.length} salon${filteredSalons.length !== 1 ? "s" : ""}`,
    professionals: `${filteredPros.length} professional${filteredPros.length !== 1 ? "s" : ""}`,
    services: `${SERVICE_CATEGORIES.length} service categories`,
    packages: `${PACKAGES.length} curated packages`,
  };

  return (
    <AppShell currentNav="discover" showFooter>
      <ClientRatingFlow />
      <ErrorBoundary>
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-4 lg:px-6">
        {/* Header */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Discover</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--ms-navy)]">Salons, professionals & services</h1>
        </div>

        {/* 4-tab toggle — scrollable on mobile */}
        <div className="mb-5 overflow-x-auto pb-1">
          <div className="inline-flex min-w-max rounded-full border border-[var(--ms-border)] bg-white p-1 shadow-[0_4px_12px_rgba(13,27,42,0.06)]">
            {(["salons", "professionals", "services", "packages"] as DiscoverTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={cn(
                  "rounded-full px-5 py-2.5 text-sm font-semibold transition-all capitalize",
                  tab === t
                    ? "bg-[var(--ms-plum)] text-white shadow-[0_4px_12px_rgba(132,36,92,0.22)]"
                    : "text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar — only shown for people tabs */}
        {isPeopleTab && (
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--ms-mauve)] shadow-[0_2px_8px_rgba(13,27,42,0.04)] hover:text-[var(--ms-navy)]"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {selected.length > 0 && (
                <span className="ml-1 rounded-full bg-[var(--ms-rose)] px-2 py-0.5 text-[10px] font-bold text-white">
                  {selected.length}
                </span>
              )}
            </button>
            <span className="ml-auto text-xs text-[var(--ms-mauve)]">{subtitleMap[tab]}</span>
            <button
              type="button"
              onClick={() => setView(view === "grid" ? "list" : "grid")}
              className="rounded-full border border-[var(--ms-border)] bg-white p-2 text-[var(--ms-mauve)] shadow-[0_2px_8px_rgba(13,27,42,0.04)] hover:text-[var(--ms-navy)]"
            >
              {view === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Count label for non-people tabs */}
        {!isPeopleTab && (
          <p className="mb-4 text-xs text-[var(--ms-mauve)]">{subtitleMap[tab]}</p>
        )}

        {/* Active filter chips */}
        {isPeopleTab && selected.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selected.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => toggle(v)}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--ms-petal)] px-3 py-1 text-xs font-semibold text-[var(--ms-plum)]"
              >
                {v}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        {/* ── Salons tab ──────────────────────────────────────────────────────── */}
        {tab === "salons" && (
          <>
            <div className={view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" : "space-y-3"}>
              {visible.map((item) => (
                <SalonCard
                  key={(item as typeof salons[0]).slug}
                  salon={item as typeof salons[0]}
                  listView={view === "list"}
                />
              ))}
            </div>
            {hasMore && <LoadMoreButton onClick={() => setShown((s) => s + PAGE_SIZE)} />}
          </>
        )}

        {/* ── Professionals tab ───────────────────────────────────────────────── */}
        {tab === "professionals" && (
          <>
            <div className={view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" : "space-y-3"}>
              {visible.map((item) => (
                <ProfessionalCard
                  key={(item as typeof professionals[0]).slug}
                  professional={item as typeof professionals[0]}
                  listView={view === "list"}
                />
              ))}
            </div>
            {hasMore && <LoadMoreButton onClick={() => setShown((s) => s + PAGE_SIZE)} />}
          </>
        )}

        {/* ── Services tab ────────────────────────────────────────────────────── */}
        {tab === "services" && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {SERVICE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const expanded = expandedCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  className="group flex flex-col items-center gap-3 rounded-[20px] border border-[var(--ms-border)] bg-white p-5 text-center shadow-[0_4px_12px_rgba(13,27,42,0.05)] transition hover:border-[var(--ms-rose)] hover:shadow-[0_8px_24px_rgba(13,27,42,0.10)]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expanded ? null : cat.id)}
                    className="flex w-full flex-col items-center gap-3"
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full transition group-hover:scale-105"
                      style={{ backgroundColor: cat.colorLight, color: cat.color }}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <p className="font-semibold text-[var(--ms-navy)]">{cat.name}</p>
                    <p className="text-xs text-[var(--ms-mauve)]">{cat.count} professionals</p>
                  </button>
                  {expanded && (
                    <div className="mt-1 flex flex-wrap justify-center gap-1 border-t border-[var(--ms-border)] pt-3">
                      {cat.subcategories.map((sub) => (
                        <span
                          key={sub}
                          className="rounded-full border border-[var(--ms-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--ms-mauve)]"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/explore/services/${cat.id}`}
                    className="mt-auto w-full rounded-full bg-[var(--ms-petal)] py-1.5 text-xs font-semibold text-[var(--ms-plum)] transition hover:bg-[var(--ms-rose)] hover:text-white"
                  >
                    Browse
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Packages tab ────────────────────────────────────────────────────── */}
        {tab === "packages" && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <article
                  key={pkg.id}
                  className="group flex flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_6px_24px_rgba(13,27,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(13,27,42,0.14)]"
                >
                  <div className="relative h-[220px] overflow-hidden">
                    <img
                      src={pkg.image}
                      alt={pkg.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,27,42,0.0)_30%,rgba(13,27,42,0.72)_100%)]" />
                    {pkg.badge && (
                      <span className="absolute left-3 top-3 rounded-full bg-[var(--ms-rose)] px-3 py-1 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(212,83,126,0.4)]">
                        {pkg.badge}
                      </span>
                    )}
                    <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">From</p>
                      <p className="text-xl font-bold leading-none text-white">{pkg.price}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-base font-bold text-[var(--ms-navy)]">{pkg.name}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[var(--ms-mauve)]">{pkg.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pkg.services.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-[var(--ms-soft-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ms-charcoal)]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--ms-mauve)]">
                      <span className="font-semibold">{pkg.duration}</span>
                      <span className="text-[var(--ms-border)]">·</span>
                      <span className="truncate">{pkg.occasion}</span>
                    </div>
                    <Link
                      href={`/explore/packages/${pkg.id}`}
                      className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(212,83,126,0.22)] transition hover:brightness-110"
                    >
                      Book this package
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter drawer — only for people tabs */}
      {isPeopleTab && (
        <FilterDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sections={tab === "salons" ? SALON_FILTERS : PRO_FILTERS}
          selected={selected}
          toggleValue={toggle}
        />
      )}
      </ErrorBoundary>
    </AppShell>
  );
}

function LoadMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-8 text-center">
      <button
        type="button"
        onClick={onClick}
        className="rounded-full border border-[var(--ms-border)] bg-white px-8 py-3 text-sm font-semibold text-[var(--ms-navy)] shadow-[0_4px_12px_rgba(13,27,42,0.06)] hover:shadow-[0_8px_24px_rgba(13,27,42,0.10)]"
      >
        Load more
      </button>
    </div>
  );
}
