import { services as catalogue } from "@/lib/site-data";

/**
 * MOBILE-PLAN-04. The package screens in Discover and at /explore/packages/<id> describe each
 * package with display labels ("Hair", "Make-up", "Nails", "Skin"), and the only route into Plan
 * passed those labels straight into `serviceIds`. The plan builder filters out anything that is not
 * a catalogue id, so the client landed on "Your plan is empty" with no explanation. This module is
 * the one place that says which real catalogue services a package is made of, so both screens and
 * the builder agree. Every id below is a shipped `services` entry; tests/package-plan-hand.cjs
 * refuses the file if one drifts.
 */
export interface PackagePlanHand {
  readonly id: string;
  /** The name the package screens print, so Plan can say what the client chose. */
  readonly name: string;
  readonly serviceIds: readonly string[];
}

export const HANDS: readonly PackagePlanHand[] = [
  // Hair, Make-up, Nails, Skin
  { id: "bridal", name: "Bridal Package", serviceIds: ["bridal-glam", "wash-blow-dry", "gel-manicure", "cleanup-facial"] },
  // Hair, Nails, Make-up
  { id: "birthday", name: "Birthday Glow", serviceIds: ["wash-blow-dry", "nail-art-upgrade", "full-glam"] },
  // Massage, Facial, Nail care
  { id: "self-care", name: "Self-Care Sunday", serviceIds: ["massage", "facial-treatment", "classic-manicure"] },
  // Hair, Make-up, Nails
  { id: "baby-shower", name: "Baby Shower", serviceIds: ["natural-hair-styling", "makeup-soft-glam", "gel-manicure"] },
  // Make-up, Hair styling
  { id: "corporate", name: "Corporate Event", serviceIds: ["full-glam", "natural-hair-styling"] },
  // Loc styling, Loc retwist
  { id: "locs-starter", name: "Locs Starter", serviceIds: ["loc-styling", "loc-retwist"] },
  // Deep treatment, Style
  { id: "natural-reset", name: "Natural Hair Reset", serviceIds: ["hair-treatment", "natural-hair-styling"] },
  // Curated each season, so there is no fixed set of services to hand until the season is named.
  { id: "seasonal", name: "Seasonal Special", serviceIds: [] },
];

const catalogueIds = new Set(catalogue.map((service) => service.id));

/** The catalogue services this package can genuinely be planned with, in the order Plan shows them. */
export function plannablePackageServices(id: string | null | undefined): string[] {
  const hand = HANDS.find((entry) => entry.id === id);
  return (hand?.serviceIds ?? []).filter((serviceId) => catalogueIds.has(serviceId));
}

/**
 * The package a set of services came from, so Plan can name it. Only an exact match counts: a plan
 * holding the bridal services plus something else is the client's own plan, and calling that a
 * package would be a claim the records do not support.
 */
export function packageForServiceIds(list: readonly string[]): PackagePlanHand | null {
  if (!list.length) return null;
  const wanted = [...new Set(list)].sort().join(",");
  return HANDS.find((hand) => hand.serviceIds.length && [...hand.serviceIds].sort().join(",") === wanted) ?? null;
}
