import { FEATURES } from "@/lib/feature-flags";

// Salon team membership is the deferred IDEA-009 work. Its panel and invite page stay in the
// tree for the design demo, but a beta tester meeting a "Team" tab on their own profile would
// read an invitation as a thing that grants access, so the surface is switched off for journeys
// rather than only labelled. One decision, used wherever the surface appears, so a tab cannot be
// offered while its content is hidden or a deep link can open an empty pane.
export function isSalonTeamSurfaceAllowed(
  role: string | null | undefined,
  flags: { SALON_TEAM_PROTOTYPE: boolean } = FEATURES,
): boolean {
  return flags.SALON_TEAM_PROTOTYPE === true && (role === "salon" || role === "team_member");
}
