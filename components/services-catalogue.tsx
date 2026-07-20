"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import {
  ArrowRight,
  Crown,
  Eye,
  Hand,
  Heart,
  Paintbrush,
  Scissors,
  Search,
  SlidersHorizontal,
  Sparkles,
  Waves,
  X,
} from "lucide-react";

import { CTAButton, PackageCard, SectionReveal, ServiceCard } from "@/components/marketplace-ui";
import type { PackageOffer, Service, ServiceCategory } from "@/lib/site-data";
import { formatDurationRange, formatPriceRange } from "@/lib/utils";

const ALL_CATEGORIES = "All";

type ActiveCategory = ServiceCategory | typeof ALL_CATEGORIES;

interface ServicesCatalogueProps {
  categories: ServiceCategory[];
  packages: PackageOffer[];
  services: Service[];
}

export function ServicesCatalogue({ categories, packages, services }: ServicesCatalogueProps) {
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>(ALL_CATEGORIES);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const trendingPackages = packages.filter((offer) => offer.trending);
  const highlightedPackages = trendingPackages.length ? trendingPackages : packages.slice(0, 4);
  const hasSearch = deferredQuery.length > 0;
  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === ALL_CATEGORIES || service.category === activeCategory;
    const searchableText = [service.name, service.category, service.description, service.inclusions].join(" ").toLowerCase();
    const matchesQuery = !hasSearch || searchableText.includes(deferredQuery);

    if (activeCategory === ALL_CATEGORIES && !hasSearch) {
      return (service.popular || service.trending) && matchesQuery;
    }

    return matchesCategory && matchesQuery;
  });
  const visibleServices = activeCategory === ALL_CATEGORIES && !hasSearch ? filteredServices.slice(0, 12) : filteredServices;
  const selectedCategoryCount =
    activeCategory === ALL_CATEGORIES ? services.length : services.filter((service) => service.category === activeCategory).length;

  return (
    <>
      <div className="scroll-mt-36" id="deals">
        <SectionReveal className="beauty-card overflow-hidden rounded-[36px] p-4 sm:p-6 lg:p-7">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-start">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Deals & packages</p>
                  <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)] sm:text-4xl">Start with the moment, not the menu.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ms-mauve)]">
                    Packages sit first because they are easier to choose, better for urgent plans, and stronger for Mobile Salon revenue.
                  </p>
                </div>
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ms-plum)] transition hover:border-[var(--ms-gold)] hover:bg-[var(--ms-soft-bg)]"
                  href="/book?package=true"
                >
                  Book a package
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="scroll-affordance mt-5">
                <span>Scroll deals sideways</span>
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="scroll-row mt-3 gap-4 pb-4">
                {highlightedPackages.map((offer) => (
                  <div className="min-w-[18.5rem] max-w-[21rem] flex-none basis-[82vw] sm:basis-[22rem] lg:basis-[23rem]" key={offer.id}>
                    <PackageCard offer={offer} />
                  </div>
                ))}
              </div>
            </div>
            <aside className="rounded-[30px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--ms-gold)] shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--ms-navy)]">Why packages are first</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--ms-charcoal)]">
                <p className="rounded-[20px] bg-white px-4 py-3">They reduce decision fatigue for last-minute beauty needs.</p>
                <p className="rounded-[20px] bg-white px-4 py-3">They make pricing clearer before a client commits.</p>
                <p className="rounded-[20px] bg-white px-4 py-3">They help the platform grow through higher-value bookings.</p>
              </div>
            </aside>
          </div>
        </SectionReveal>
      </div>

      <div className="scroll-mt-36" id="services-picker">
        <SectionReveal className="silk-panel rounded-[36px] p-4 sm:p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.32fr)_minmax(0,0.68fr)]">
            <aside className="rounded-[30px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_18px_50px_rgba(13,27,42,0.06)] sm:p-5 xl:sticky xl:top-36 xl:self-start">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Find a service</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)]">Search, then tap one category.</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ms-mauve)]">
              No need to scroll through everything. Type what you want, or choose Hair, Nails, Make-Up, Lashes, and more.
            </p>
            <label className="mt-5 block" htmlFor="service-search">
              <span className="text-sm font-semibold text-[var(--ms-navy)]">Search services</span>
              <span className="mt-2 flex items-center gap-3 rounded-[22px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 focus-within:border-[var(--ms-gold)]">
                <Search className="h-4 w-4 text-[var(--ms-mauve)]" />
                <input
                  className="w-full bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
                  id="service-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try braids, lashes, pedicure..."
                  type="search"
                  value={query}
                />
                {query ? (
                  <button
                    aria-label="Clear service search"
                    className="rounded-full bg-white p-1 text-[var(--ms-mauve)] transition hover:text-[var(--ms-plum)]"
                    onClick={() => setQuery("")}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </span>
            </label>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">
              <SlidersHorizontal className="h-4 w-4" />
              Filter by category
            </div>
            <div className="scroll-row mt-3 gap-2 pb-3 xl:grid xl:max-h-[28rem] xl:grid-cols-1 xl:overflow-auto">
              <CategoryButton
                active={activeCategory === ALL_CATEGORIES}
                count={services.length}
                label={ALL_CATEGORIES}
                onClick={() => setActiveCategory(ALL_CATEGORIES)}
              />
              {categories.map((category) => (
                <CategoryButton
                  active={activeCategory === category}
                  count={services.filter((service) => service.category === category).length}
                  key={category}
                  label={category}
                  onClick={() => setActiveCategory(category)}
                />
              ))}
            </div>
            </aside>

            <div>
            <div className="rounded-[30px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_18px_50px_rgba(13,27,42,0.05)] sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Services</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--ms-navy)]">
                    {activeCategory === ALL_CATEGORIES && !hasSearch ? "Recommended first choices" : activeCategory}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">
                    {visibleServices.length
                      ? `${visibleServices.length} shown from ${selectedCategoryCount} available. Prices and timing stay visible before booking.`
                      : "No service matched that search. Try a shorter word like braids, nails, lashes, or glam."}
                  </p>
                </div>
                <CTAButton href="/book?rush=true">Start rush booking</CTAButton>
              </div>
              {activeCategory === ALL_CATEGORIES && !hasSearch ? (
                <div className="mt-4 rounded-[22px] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm leading-6 text-[var(--ms-charcoal)]">
                  Choose a category on the left when you want the full list. This keeps the page calm instead of showing every service at once.
                </div>
              ) : null}
            </div>

            {visibleServices.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {visibleServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[30px] border border-dashed border-[var(--ms-border)] bg-white p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-[var(--ms-gold)]">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-[var(--ms-navy)]">Try another word</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ms-mauve)]">
                  Beauty services can be named differently by each professional. Search broad words first, then narrow by category.
                </p>
              </div>
            )}
            </div>
          </div>
        </SectionReveal>
      </div>
    </>
  );
}

function CategoryButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: ActiveCategory;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        "group flex min-w-[13rem] items-center justify-between gap-3 rounded-[22px] border px-4 py-3 text-left transition",
        active
          ? "border-[var(--ms-gold)] bg-[var(--ms-navy)] text-white shadow-[0_16px_38px_rgba(13,27,42,0.16)]"
          : "border-[var(--ms-border)] bg-white text-[var(--ms-plum)] hover:border-[var(--ms-gold)] hover:bg-[var(--ms-soft-bg)]",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-3">
        <span
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full transition",
            active ? "bg-white/12 text-[var(--ms-gold)]" : "bg-[var(--ms-soft-bg)] text-[var(--ms-gold)] group-hover:bg-white",
          ].join(" ")}
        >
          {renderCategoryIcon(label)}
        </span>
        <span>
          <span className="block text-sm font-semibold">{label}</span>
          <span className={active ? "text-xs text-white/65" : "text-xs text-[var(--ms-mauve)]"}>{count} options</span>
        </span>
      </span>
      <ArrowRight className="h-4 w-4 opacity-70" />
    </button>
  );
}

function renderCategoryIcon(category: ActiveCategory) {
  const className = "h-4 w-4";

  switch (category) {
    case "Hair":
      return <Waves className={className} />;
    case "Nails":
      return <Sparkles className={className} />;
    case "Make-Up":
      return <Paintbrush className={className} />;
    case "Lashes / Brows":
      return <Eye className={className} />;
    case "Short Hair & Shave":
      return <Scissors className={className} />;
    case "Care / Skin":
      return <Heart className={className} />;
    case "Self-Care / Beauty":
      return <Hand className={className} />;
    case "Bridal & Events":
      return <Crown className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export function ServiceQuickSummary({ service }: { service: Service }) {
  return `${service.name}: ${formatPriceRange(service.minPrice, service.maxPrice)}, ${formatDurationRange(
    service.durationMin,
    service.durationMax,
  )}`;
}
