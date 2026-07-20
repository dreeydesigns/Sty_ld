"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { professionals, salons } from "@/lib/site-data";
import {
  DesktopSidebar,
  EmptyState,
  FilterButton,
  FilterDrawer,
  ProfessionalCard,
  SalonCard,
  SearchBar,
  SectionReveal,
  type FilterSection,
} from "@/components/marketplace-ui";
import { rankProfessionals, rankSalons } from "@/lib/discovery-ranking";
import { cn } from "@/lib/utils";

export function MarketplaceDiscovery({
  collection,
}: {
  collection: "salons" | "professionals";
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("top-rated");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [layout, setLayout] = useState<"stack" | "grid">("stack");
  const deferredQuery = useDeferredValue(query);

  const filters: FilterSection[] =
    collection === "salons"
      ? [
          { label: "Location", options: ["Kilimani", "Westlands", "South B", "Lavington", "Karen"] },
          { label: "Salon type", options: ["Hair Salon", "Beauty Spa", "Nail Bar", "Multi-service"] },
          { label: "Services offered", options: ["Hair", "Nails", "Make-up", "Skincare", "Massage", "Waxing"] },
          { label: "Verified only", options: ["Verified"] },
        ]
      : [
          { label: "Location", options: ["Kilimani", "Karen", "Westlands", "South B", "Lavington"] },
          { label: "Service mode", options: ["In salon", "Mobile", "Both"] },
          { label: "Specialty", options: ["Bridal", "Natural Hair", "Nails", "Self-Care", "Short Hair & Shave", "Locs", "Make-up"] },
          { label: "Availability", options: ["Today", "This week"] },
          { label: "Verified only", options: ["Verified"] },
        ];

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const salonResults = rankSalons(
    salons.filter((item) => {
      const searchable = `${item.name} ${item.location} ${item.tagline} ${item.categoryTags.join(" ")} ${item.areasServed.join(" ")}`;
      const queryMatch = normalizedQuery ? searchable.toLowerCase().includes(normalizedQuery) : true;
      const filterMatch =
        selected.length === 0 ||
        selected.every(
          (value) =>
            item.location.includes(value) ||
            item.categoryTags.includes(value) ||
            item.serviceIds.some((serviceId) => serviceId.includes(value.toLowerCase().replace(/\s+/g, "-"))) ||
            (value === "Mobile service" && item.mobileService) ||
            (value === "Verified" && item.verified),
        );

      return queryMatch && filterMatch;
    }),
    sortBy as "top-rated" | "nearest" | "price-low" | "earliest",
  );

  const professionalResults = rankProfessionals(
    professionals.filter((item) => {
      const searchable = `${item.name} ${item.location} ${item.specialty} ${item.areasServed.join(" ")} ${item.identityAttributes.join(" ")}`;
      const queryMatch = normalizedQuery ? searchable.toLowerCase().includes(normalizedQuery) : true;
      const filterMatch =
        selected.length === 0 ||
        selected.every(
          (value) =>
            item.location.includes(value) ||
            item.serviceMode === value ||
            item.specialty.includes(value) ||
            item.identityAttributes.includes(value) ||
            (value === "Verified" && item.verified),
        );

      return queryMatch && filterMatch;
    }),
    sortBy as "top-rated" | "nearest" | "price-low" | "earliest",
  );

  const results = collection === "salons" ? salonResults : professionalResults;

  function toggleSelected(value: string) {
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <SectionReveal className="silk-panel min-w-0 overflow-hidden rounded-[32px] p-4 sm:p-6">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,0.3fr)] xl:items-end">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--ms-mauve)]">
              {collection === "salons" ? "Salons & Spas" : "Professionals"}
            </p>
            <h1 className="mt-3 break-words text-3xl font-semibold leading-tight text-[var(--ms-plum)] sm:text-4xl">
              {collection === "salons"
                ? "Trusted businesses. Verified spaces."
                : "Find the person for your glow."}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ms-mauve)]">Browse. Compare. Then book.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <Link className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-[var(--ms-plum)] shadow-[0_12px_28px_rgba(132,36,92,0.08)]" href="/guide">
              Guide
            </Link>
            <Link className="rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_14px_32px_rgba(232,62,140,0.24)]" href="/book?rush=true">
              Book now
            </Link>
          </div>
        </div>
      </SectionReveal>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <DesktopSidebar title="Refine results">
          <div className="space-y-5">
            {filters.map((section) => (
              <div key={section.label}>
                <p className="mb-3 text-sm font-semibold text-[var(--ms-navy)]">{section.label}</p>
                <div className="flex flex-wrap gap-2">
                  {section.options.map((option) => {
                    const active = selected.includes(option);

                    return (
                      <button
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm transition",
                          active
                            ? "border-[var(--ms-magenta)] bg-[var(--ms-magenta)] text-white"
                            : "border-[var(--ms-border)] bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)]",
                        )}
                        key={option}
                        onClick={() => toggleSelected(option)}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DesktopSidebar>

        <div className="min-w-0 space-y-5">
          <div className="beauty-card flex min-w-0 flex-col gap-3 overflow-hidden rounded-[28px] p-4 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <SearchBar
                onChange={setQuery}
                placeholder={
                  collection === "salons"
                    ? "Search salons, areas, or services"
                    : "Search by name, specialty, or location"
                }
                value={query}
              />
            </div>
            <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)] md:flex md:w-auto md:flex-wrap md:items-center">
              <FilterButton onClick={() => setMobileFiltersOpen(true)} />
              <select
                className="min-h-12 w-full min-w-0 rounded-full border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 text-sm text-[var(--ms-navy)] outline-none md:w-auto"
                onChange={(event) => setSortBy(event.target.value)}
                value={sortBy}
              >
                <option value="top-rated">Top rated</option>
                <option value="nearest">Nearest</option>
                <option value="price-low">Price low-high</option>
                <option value="earliest">Earliest available</option>
              </select>
              {collection === "salons" ? (
                <div className="hidden rounded-full border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-1 md:flex">
                  <button
                    className={cn(
                      "rounded-full px-4 py-2 text-sm",
                      layout === "stack" ? "bg-white text-[var(--ms-navy)]" : "text-[var(--ms-mauve)]",
                    )}
                    onClick={() => setLayout("stack")}
                    type="button"
                  >
                    Stack
                  </button>
                  <button
                    className={cn(
                      "rounded-full px-4 py-2 text-sm",
                      layout === "grid" ? "bg-white text-[var(--ms-navy)]" : "text-[var(--ms-mauve)]",
                    )}
                    onClick={() => setLayout("grid")}
                    type="button"
                  >
                    Grid
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <p className="text-sm text-[var(--ms-mauve)]">{results.length} results</p>

          {results.length ? (
            <div className={cn("grid min-w-0 gap-5", layout === "grid" ? "xl:grid-cols-2" : "grid-cols-1")}>
              {collection === "salons"
                ? salonResults.map((salon) => <SalonCard key={salon.slug} salon={salon} />)
                : professionalResults.map((professional) => (
                    <ProfessionalCard key={professional.slug} professional={professional} />
                  ))}
            </div>
          ) : (
            <EmptyState
              copy="Try a different area, remove one filter, or switch between salons and professionals."
              title="No exact matches yet"
            />
          )}
        </div>
      </div>

      <FilterDrawer
        onClose={() => setMobileFiltersOpen(false)}
        open={mobileFiltersOpen}
        sections={filters}
        selected={selected}
        toggleValue={toggleSelected}
      />
    </div>
  );
}
