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
      if (a.price === null || b.price === null) {
        if (a.price === b.price) return a.name.localeCompare(b.name);
        return a.price === null ? 1 : -1;
      }
      return sort === "price" ? a.price - b.price : b.price - a.price;
    });
}
