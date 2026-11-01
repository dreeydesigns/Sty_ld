export type PlanServiceSort = "name" | "price" | "price-desc";

export interface PlanCatalogueQuery {
  query: string;
  category: string;
  sort: PlanServiceSort;
}

interface CatalogueService {
  name: string;
  category: string;
  price: number | null;
}

/**
 * The one price rule the plan list uses for both display and ordering. A price
 * that cannot be listed is not zero and is not a number to sort by, so it reads
 * as "Price not provided" and sorts last.
 */
export function planListedPriceCents(price: number | null | undefined): number | null {
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) return null;
  const cents = Math.round(price * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(price * 100 - cents) > 0.00001) return null;
  return cents;
}

/**
 * Filters and orders the plan catalogue for display. The caller's selection
 * lives in the plan draft, so changing a filter never drops a chosen service.
 * Services without a listed price sort last instead of pretending to be free.
 */
export function filterPlanServices<T extends CatalogueService>(
  services: T[],
  { query, category, sort }: PlanCatalogueQuery
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  return services
    .filter((service) => category === "all" || service.category === category)
    .filter(
      (service) =>
        !normalizedQuery || `${service.name} ${service.category}`.toLowerCase().includes(normalizedQuery)
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const priceA = planListedPriceCents(a.price);
      const priceB = planListedPriceCents(b.price);
      if (priceA === null || priceB === null) {
        if (priceA === priceB) return a.name.localeCompare(b.name);
        return priceA === null ? 1 : -1;
      }
      return sort === "price" ? priceA - priceB : priceB - priceA;
    });
}
