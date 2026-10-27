import type { MetadataRoute } from "next";

// The beta is invite-only and holds real people's photos, bookings and salons. Nothing here
// is public content waiting to be ranked, so every crawler is refused on every deployment,
// including the one that will eventually serve customers. Removal is a launch decision, not a
// default. next.config.mjs also sends X-Robots-Tag on preview deployments, because a robots
// file only asks politely while a header is an instruction.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
