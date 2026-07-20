import { redirect } from "next/navigation";

/**
 * /explore is now merged into /discover (Services & Packages tabs).
 * Redirect permanently so any bookmarked or linked /explore URLs still work.
 */
export default function ExplorePage() {
  redirect("/discover");
}
