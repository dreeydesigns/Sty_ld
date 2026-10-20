"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useDeferredValue, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  LookCard,
  FilterDrawer,
  type FilterSection,
} from "@/components/marketplace-ui";
import { APP_SESSION_EVENT, readAppSession } from "@/lib/client-session";
import { professionals, salons, services } from "@/lib/site-data";
import { BEAUTY_LOOKS, type BeautyLook } from "@/lib/looks-data";
import { rankByBeautyWorld } from "@/lib/content-relevance";
import { rankProfessionals, rankSalons } from "@/lib/discovery-ranking";
import { getThemeConfig, type ThemeKey } from "@/lib/personalization";
import { matchesPlanServiceIds } from "@/lib/plan-offer.cjs";
import { splitServiceIds } from "@/lib/plan-context.cjs";
import { buildPlanHref } from "@/lib/plan-draft";
import { cn } from "@/lib/utils";
import { ClientRatingFlow } from "@/components/service-session";
import { ErrorBoundary } from "@/components/error-boundary";

type DiscoverTab = "looks" | "salons" | "professionals" | "services" | "packages";
type SortKey = "recommended" | "nearest" | "price-low" | "earliest";

const PAGE_SIZE = 12;

// ─── Filter configs ───────────────────────────────────────────────────────────

const LOOK_FILTERS: FilterSection[] = [
  { label: "Category", options: ["Protective Styles & Braids", "Natural Hair & Curls", "Locs & Sisterlocks", "Nails & Nail Art", "Soft Glam & Makeup", "Silk Press & Styling", "Cuts & Fades", "Lashes & Brows"] },
  { label: "Location", options: ["Kilimani", "Westlands", "Karen", "South B"] },
  { label: "Service mode", options: ["Mobile", "In salon", "Both"] },
  { label: "Price range", options: ["Under Ksh 2,500", "Ksh 2,500–5,000", "Ksh 5,000+"] },
];

const LOOK_QUICK_CHIPS = [
  "All",
  "Braids",
  "Locs",
  "Natural Hair",
  "Nails",
  "Makeup",
  "Silk Press",
  "Cuts",
  "Lashes",
];

const SALON_FILTERS: FilterSection[] = [
  { label: "Location", options: ["Kilimani", "Westlands", "South B", "Lavington", "Karen"] },
  { label: "Distance", options: ["Within 5km", "Within 10km", "Within 25km", "Anywhere"] },
  { label: "Salon type", options: ["Hair Salon", "Beauty Spa", "Nail Bar", "Multi-service"] },
  { label: "Services", options: ["Hair", "Nails", "Make-up", "Skincare", "Massage", "Waxing"] },
  { label: "Price range", options: ["Under Ksh 1,000", "Ksh 1,000–2,500", "Ksh 2,500–5,000", "Ksh 5,000+"] },
];

const PRO_FILTERS: FilterSection[] = [
  { label: "Location", options: ["Kilimani", "Karen", "Westlands", "South B", "Lavington"] },
  { label: "Distance", options: ["Within 5km", "Within 10km", "Within 25km", "Anywhere"] },
  { label: "Service mode", options: ["Mobile", "In salon", "Both"] },
  { label: "Specialty", options: ["Bridal", "Natural Hair", "Nails", "Self-Care", "Short Hair & Shave", "Locs", "Make-up"] },
  { label: "Price range", options: ["Under Ksh 1,000", "Ksh 1,000–2,500", "Ksh 2,500–5,000", "Ksh 5,000+"] },
  { label: "Availability", options: ["Today", "This week"] },
];

// ─── Services data ────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES = [
  { id: "hair", name: "Hair", icon: Waves, color: "#C0A090", colorLight: "rgba(192,160,144,0.08)", subcategories: ["Braiding", "Locs", "Weaves", "Relaxer", "Dye / Colour", "Wash & Go", "Cuts", "Natural Hair"], count: 48 },
  { id: "nails", name: "Nails", icon: Hand, color: "#909888", colorLight: "rgba(144,152,136,0.08)", subcategories: ["Gel Manicure", "Acrylic", "Nail Art", "Pedicure", "Nail Extensions"], count: 34 },
  { id: "makeup", name: "Make-up", icon: Sparkles, color: "#BF8C2E", colorLight: "rgba(201,168,76,0.08)", subcategories: ["Bridal", "Events", "Natural", "Glam", "Lashes"], count: 29 },
  { id: "skincare", name: "Skincare", icon: Leaf, color: "#1A7A6B", colorLight: "rgba(58,92,65,0.08)", subcategories: ["Facial", "Glow Treatment", "Acne Care", "Chemical Peel"], count: 22 },
  { id: "massage", name: "Massage", icon: Heart, color: "#EA580C", colorLight: "rgba(201,168,76,0.08)", subcategories: ["Full Body", "Back & Neck", "Relaxation", "Deep Tissue"], count: 18 },
  { id: "waxing", name: "Waxing", icon: Droplets, color: "#C0A090", colorLight: "rgba(192,160,144,0.06)", subcategories: ["Body Wax", "Facial Wax", "Brow Shaping"], count: 15 },
  { id: "threading", name: "Threading", icon: Scissors, color: "#909888", colorLight: "rgba(144,152,136,0.06)", subcategories: ["Brow Threading", "Upper Lip", "Full Face"], count: 12 },
  { id: "wellness", name: "Wellness", icon: Leaf, color: "#1A7A6B", colorLight: "rgba(58,92,65,0.06)", subcategories: ["Body Wrap", "Steam", "Hot Oil Treatment"], count: 11 },
  { id: "bridal", name: "Bridal", icon: Gem, color: "#BF8C2E", colorLight: "rgba(201,168,76,0.06)", subcategories: ["Full bridal preparation packages"], count: 9 },
  { id: "locs-braids", name: "Locs & Braids", icon: Waves, color: "#EA580C", colorLight: "rgba(201,168,76,0.06)", subcategories: ["Locs Installation", "Locs Maintenance", "Braiding"], count: 31 },
];

// ─── Packages data ────────────────────────────────────────────────────────────

const PACKAGES = [
  { id: "bridal", name: "Bridal Package", icon: Gem, color: "#BF8C2E", services: ["Hair", "Make-up", "Nails", "Skin"], price: "KES 18,000", duration: "Full day", description: "Your most important day deserves your most beautiful self.", image: "https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Wedding day" },
  { id: "birthday", name: "Birthday Glow", icon: Star, color: "#C0A090", services: ["Hair", "Nails", "Make-up"], price: "KES 8,500", duration: "4–6 hrs", description: "Because you deserve to be celebrated — loudly.", image: "https://images.pexels.com/photos/3738359/pexels-photo-3738359.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: "Popular" as string | null, occasion: "Birthday" },
  { id: "self-care", name: "Self-Care Sunday", icon: Leaf, color: "#1A7A6B", services: ["Massage", "Facial", "Nail care"], price: "KES 9,200", duration: "Full day", description: "Rest is a ritual. You have earned this.", image: "https://images.pexels.com/photos/3997990/pexels-photo-3997990.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Self-care day" },
  { id: "baby-shower", name: "Baby Shower", icon: Heart, color: "#909888", services: ["Hair", "Make-up", "Nails"], price: "KES 7,800", duration: "3–4 hrs", description: "Glow different when you are welcoming a new chapter.", image: "https://images.pexels.com/photos/3912572/pexels-photo-3912572.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Baby shower" },
  { id: "corporate", name: "Corporate Event", icon: Briefcase, color: "#EA580C", services: ["Make-up", "Hair styling"], price: "KES 5,500", duration: "2–3 hrs", description: "Command the room the moment you walk in.", image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Corporate event" },
  { id: "seasonal", name: "Seasonal Special", icon: CalendarDays, color: "#C0A090", services: ["Varies by season"], price: "KES 6,000", duration: "3–5 hrs", description: "Every season has a ritual. This one is yours.", image: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: "Limited" as string | null, occasion: "Valentine's Day" },
  { id: "locs-starter", name: "Locs Starter", icon: Waves, color: "#1A7A6B", services: ["Locs installation", "Consultation"], price: "KES 4,500", duration: "4–8 hrs", description: "The beginning of a lifelong relationship with your hair.", image: "https://images.pexels.com/photos/3993398/pexels-photo-3993398.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "New locs journey" },
  { id: "natural-reset", name: "Natural Hair Reset", icon: Droplets, color: "#909888", services: ["Deep treatment", "Style", "Aftercare guide"], price: "KES 3,800", duration: "2–3 hrs", description: "Your curls remember what they are capable of.", image: "https://images.pexels.com/photos/3993392/pexels-photo-3993392.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop", badge: null as string | null, occasion: "Hair reset" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Providers don't have a Discover page — send them to their home feed
  useEffect(() => {
    const session = readAppSession();
    if (session?.role === "professional" || session?.role === "salon") {
      router.replace("/home");
    }
  }, [router]);

  useEffect(() => {
    function syncBeautyWorld() {
      const session = readAppSession();
      setBeautyWorld(session?.role === "client" ? session.theme : "not_set");
    }

    syncBeautyWorld();
    window.addEventListener(APP_SESSION_EVENT, syncBeautyWorld);

    return () => window.removeEventListener(APP_SESSION_EVENT, syncBeautyWorld);
  }, []);

  const [tab, setTab] = useState<DiscoverTab>("looks");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [sortBy] = useState<SortKey>("recommended");
  const [quickLookChip, setQuickLookChip] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [beautyWorld, setBeautyWorld] = useState<ThemeKey>("not_set");
  const deferredSearch = useDeferredValue(search);
  const planServiceIds = useMemo(
    () => splitServiceIds(searchParams.get("serviceIds") ?? ""),
    [searchParams],
  );
  const planReturnHref = useMemo(
    () =>
      buildPlanHref({
        serviceIds: planServiceIds,
        targetType: searchParams.get("targetType"),
        targetId: searchParams.get("targetId"),
      }),
    [planServiceIds, searchParams],
  );
  const planServiceNames = useMemo(
    () =>
      planServiceIds
        .map((id) => services.find((service) => service.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [planServiceIds],
  );
  const externalParamSyncRef = useRef(false);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  useEffect(() => {
    const type = searchParams.get("tab");
    const valid = ["looks","salons","professionals","services","packages"];
    if (type && valid.includes(type) && tabRef.current !== type) {
      externalParamSyncRef.current = true;
      setTab(type as DiscoverTab);
      setSelected([]);
      setShown(PAGE_SIZE);
      setExpandedCategory(null);
      setQuickLookChip("All");
    }
    const q = searchParams.get("q");
    if (q !== null) {
      setSearch((prev) => {
        if (prev === q) return prev;
        externalParamSyncRef.current = true;
        return q;
      });
    } else {
      setSearch((prev) => {
        if (prev === "") return prev;
        externalParamSyncRef.current = true;
        return "";
      });
    }
  }, [searchParams]);
  const deferredSelected = useDeferredValue(selected);

  useEffect(() => {
    if (externalParamSyncRef.current) {
      externalParamSyncRef.current = false;
      return;
    }
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("tab", tab);
    if (search.trim()) params.set("q", search.trim()); else params.delete("q");
    const nextUrl = "/discover?" + params.toString();
    const currentUrl = "/discover?" + searchParams.toString();
    if (nextUrl === currentUrl) return;
    router.replace(nextUrl, { scroll: false });
  }, [tab, search, router, searchParams]);

  function toggle(value: string) {
    setSelected((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    setShown(PAGE_SIZE);
  }

  function switchTab(next: DiscoverTab) {
    setTab(next);
    setSelected([]);
    setShown(PAGE_SIZE);
    setExpandedCategory(null);
    setQuickLookChip("All");
  }

  const providerAffinity = (slug: string) =>
    professionals.find((provider) => provider.slug === slug)?.themeAffinity ??
    salons.find((salon) => salon.slug === slug)?.themeAffinity;

  const matchedLooks = BEAUTY_LOOKS.filter((look) => {
    const term = deferredSearch.trim().toLowerCase();
    if (term) {
      const match = [look.title, look.category, look.location, ...look.tags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      if (!match) return false;
    }
    if (quickLookChip !== "All") {
      const q = quickLookChip.toLowerCase();
      const matchesCat = look.category.toLowerCase().includes(q);
      const matchesTags = look.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTitle = look.title.toLowerCase().includes(q);
      if (!matchesCat && !matchesTags && !matchesTitle) return false;
    }

    if (deferredSelected.length === 0) return true;

    return deferredSelected.every((v) => {
      if (v === "Under Ksh 2,500") return look.startingPrice < 2500;
      if (v === "Ksh 2,500–5,000") return look.startingPrice >= 2500 && look.startingPrice <= 5000;
      if (v === "Ksh 5,000+") return look.startingPrice > 5000;
      return (
        look.location.includes(v) ||
        look.category.includes(v) ||
        look.serviceMode === v ||
        look.tags.some((t) => t.includes(v))
      );
    });
  });

  const filteredLooks = rankByBeautyWorld(matchedLooks, beautyWorld, providerAffinity);

  const planFilterActive =
    planServiceIds.length > 0 && deferredSelected.length === 0 && !deferredSearch.trim();

  const filteredSalons = rankSalons(
    salons.filter((s) => {
      if (planFilterActive && !matchesPlanServiceIds(s.serviceIds, planServiceIds)) return false;
      const term = deferredSearch.trim().toLowerCase();
      if (term && ![s.name, s.location, s.tagline, ...s.categoryTags, ...(s.serviceIds ?? [])].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))) return false;
      if (deferredSelected.length === 0) return true;
      return deferredSelected.every(
        (v) => s.location.includes(v) || s.categoryTags.includes(v) ||
          s.serviceIds.some((id) => id.includes(v.toLowerCase().replace(/\s+/g, "-"))),
      );
    }),
    sortBy,
    beautyWorld,
  );

  const filteredPros = rankProfessionals(
    professionals.filter((p) => {
      if (planFilterActive && !matchesPlanServiceIds(p.serviceIds, planServiceIds)) return false;
      const term = deferredSearch.trim().toLowerCase();
      if (term && ![p.name, p.location, p.specialty, ...(p.identityAttributes ?? []), ...(p.serviceIds ?? [])].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))) return false;
      if (deferredSelected.length === 0) return true;
      return deferredSelected.every(
        (v) => p.location.includes(v) || p.serviceMode === v ||
          p.specialty.includes(v) || p.identityAttributes.includes(v) ||
          (v === "Today" && p.nextAvailable?.toLowerCase().includes("today")),
      );
    }),
    sortBy,
    beautyWorld,
  );

  const isFilterableTab = tab === "looks" || tab === "salons" || tab === "professionals";
  const results = tab === "salons" ? filteredSalons : filteredPros;
  const visible = results.slice(0, shown);
  const hasMore = shown < results.length;

  const subtitleMap: Record<DiscoverTab, string> = {
    looks: `${filteredLooks.length} visual look${filteredLooks.length !== 1 ? "s" : ""}`,
    salons: `${filteredSalons.length} salon${filteredSalons.length !== 1 ? "s" : ""}`,
    professionals: `${filteredPros.length} professional${filteredPros.length !== 1 ? "s" : ""}`,
    services: `${SERVICE_CATEGORIES.length} service categories`,
    packages: `${PACKAGES.length} curated packages`,
  };

  return (
    <AppShell currentNav="discover" showFooter>
      <ClientRatingFlow />
      <ErrorBoundary>
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 pb-24 pt-4 lg:px-6">
        {planServiceIds.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Your plan is saved in this tab</p>
              <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
                {planServiceNames.length
                  ? planServiceNames.join(", ")
                  : `${planServiceIds.length} selected services`}
              </p>
            </div>
            <Link
              href={planReturnHref}
              className="shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-clay)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              Back to your plan
            </Link>
          </div>
        ) : null}
        {/* Header */}
        <div className="world-glass mb-6 rounded-[28px] border border-[var(--world-glass-border)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-clay-text)]">Discover</p>
          <h1 className="mt-1 text-[clamp(1.65rem,3vw,2.25rem)] font-display font-semibold leading-tight">Looks, salons, professionals & services</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Search supported categories, service names, provider specialties, salon names and location descriptions. Browse category services, compare honest details, and choose without unsupported claims.</p>
          <label className="mt-4 block">
            <span className="sr-only">Search discovery</span>
            <div className="flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search braids, Kenyatta, glow treatment…"
                className="min-h-11 flex-1 bg-transparent py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="min-h-11 px-2 text-[var(--text-secondary)]" aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </label>
        </div>

        {/* 5-tab toggle — scrollable on mobile */}
        <div className="mb-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            data-tour="discover-tabs"
            role="tablist"
            aria-label="Discover sections"
            className="inline-flex min-w-max items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-sm"
          >
            {(["looks", "salons", "professionals", "services", "packages"] as DiscoverTab[]).map((t) => (
              <button
                key={t}
                id={`tab-${t}`}
                role="tab"
                aria-selected={tab === t}
                aria-controls={`panel-${t}`}
                type="button"
                onClick={() => switchTab(t)}
                className={cn(
                  "min-h-[44px] rounded-full px-5 py-2.5 text-sm font-semibold transition-all capitalize inline-flex items-center justify-center",
                  tab === t
                    ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--action-ghost-hover)]",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Quick category chips for Looks */}
        {tab === "looks" && (
          <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LOOK_QUICK_CHIPS.map((chip) => {
              const active = quickLookChip === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuickLookChip(chip)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all border",
                    active
                      ? "bg-[var(--color-clay)] text-[var(--color-ink)] border-[var(--color-clay)] shadow-sm scale-[1.02]"
                      : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--color-clay)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        )}

        {/* Toolbar — shown for filterable tabs */}
        {isFilterableTab && (
          <div className="mb-4 flex items-center gap-2">
            <button
              data-tour="discover-filters"
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm hover:border-[var(--color-clay)]"
            >
              <SlidersHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
              Filters
              {selected.length > 0 && (
                <span className="ml-1 rounded-full bg-[var(--color-clay)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-ink)]">
                  {selected.length}
                </span>
              )}
            </button>
            <span className="ml-auto text-xs text-[var(--text-secondary)] font-medium">{subtitleMap[tab]}</span>
            {tab !== "looks" && (
              <button
                type="button"
                onClick={() => setView(view === "grid" ? "list" : "grid")}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 text-[var(--text-primary)] shadow-sm hover:border-[var(--color-clay)]"
              >
                {view === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}

        {/* Count label for non-filterable tabs */}
        {!isFilterableTab && (
          <p className="mb-4 text-xs text-[var(--text-secondary)] font-medium">{subtitleMap[tab]}</p>
        )}

        {beautyWorld !== "not_set" && isFilterableTab ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5">
            <span className="bw-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold">
              <Sparkles aria-hidden="true" className="h-3 w-3" />
              {getThemeConfig(beautyWorld).displayName} world
            </span>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              Ranking leans toward your beauty world. Search and filters always take priority.
            </p>
          </div>
        ) : null}

        {/* Active filter chips */}
        {isFilterableTab && selected.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selected.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => toggle(v)}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--color-clay)]"
              >
                {v}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        {/* ── Looks tab ───────────────────────────────────────────────────────── */}
        {tab === "looks" && (
          <>
             {filteredLooks.length === 0 ? (
              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center">
                <p className="text-base font-semibold text-[var(--text-primary)]">{deferredSearch.trim() ? 'No looks match "' + deferredSearch.trim() + '"' : 'No looks match your selected filters'}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{deferredSearch.trim() ? 'Clear search, then try another style, location, or category.' : 'Try clearing some filters or exploring a different beauty category.'}</p>
                <button
                  type="button"
                  onClick={() => { setSelected([]); setQuickLookChip("All"); setSearch(""); }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--action-primary-bg)] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[var(--action-primary-text)]"
                >
                  Clear search and filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredLooks.slice(0, shown).map((look) => (
                  <LookCard key={look.id} look={look} />
                ))}
              </div>
            )}
            {shown < filteredLooks.length && (
              <LoadMoreButton onClick={() => setShown((s) => s + PAGE_SIZE)} />
            )}
          </>
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
            {filteredSalons.length === 0 && (
              <div className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
                <p className="text-base font-semibold text-[var(--text-primary)]">No salons match your search</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Try another name, neighborhood or category.</p>
              </div>
            )}
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
            {filteredPros.length === 0 && (
              <div className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
                <p className="text-base font-semibold text-[var(--text-primary)]">No professionals match your search</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Try another name, specialty or service mode.</p>
              </div>
            )}
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
                  className="group flex flex-col items-center gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-5 text-center shadow-sm transition hover:border-[var(--color-clay)] hover:shadow-md"
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
                    <p className="font-semibold text-[var(--text-primary)]">{cat.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">View subcategories</p>
                  </button>
                  {expanded && (
                    <div className="mt-1 flex flex-wrap justify-center gap-1 border-t border-[var(--border-subtle)] pt-3">
                      {cat.subcategories.map((sub) => (
                        <span
                          key={sub}
                          className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/explore/services/${cat.id}`}
                    className="mt-auto w-full rounded-full bg-[var(--bg-surface-raised)] py-1.5 text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-subtle)] transition hover:border-[var(--color-clay)]"
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
                  className="group flex flex-col overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative h-[220px] overflow-hidden">
                    <img
                      src={pkg.image}
                      alt={pkg.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.0)_30%,rgba(0,0,0,0.72)_100%)]" />
                    {pkg.badge && (
                      <span className="absolute left-3 top-3 rounded-full bg-[var(--color-clay)] px-3 py-1 text-[11px] font-bold text-[var(--color-ink)] shadow-sm">
                        {pkg.badge}
                      </span>
                    )}
                    <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">From</p>
                      <p className="text-xl font-bold leading-none text-white">{pkg.price}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{pkg.name}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{pkg.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pkg.services.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-medium">
                      <span className="font-semibold text-[var(--text-primary)]">{pkg.duration}</span>
                      <span className="text-[var(--border-strong)]">·</span>
                      <span className="truncate">{pkg.occasion}</span>
                    </div>
                    <Link
                      href={`/explore/packages/${pkg.id}`}
                      className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] py-2.5 text-sm font-semibold shadow-sm transition hover:bg-[var(--action-primary-hover)]"
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

      {/* Filter drawer — for looks, salons, and professionals */}
      {isFilterableTab && (
        <FilterDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sections={tab === "looks" ? LOOK_FILTERS : tab === "salons" ? SALON_FILTERS : PRO_FILTERS}
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
        className="rounded-full border border-[var(--border-subtle)] bg-[var(--card-bg)] px-8 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:border-[var(--color-clay)]"
      >
        Load more
      </button>
    </div>
  );
}
