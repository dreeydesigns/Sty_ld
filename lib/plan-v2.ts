export type PlanFields = {
  schemaVersion: 2;
  lookPostId: string | null;
  creatorWorkspaceId: string | null;
  serviceIds: string[];
  preferredDate: string | null;
  timeWindow: "morning" | "afternoon" | "evening" | null;
  serviceMode: "salon" | "mobile" | null;
  locationArea: string;
  shortlistProviderWorkspaceIds: string[];
  leadingChoiceProviderWorkspaceId: string | null;
};
export type SavedPlan = PlanFields & { revision: number; updatedAt: string | null };
export type PlanService = { id: string; name: string; workspaceId: string | null; price: number | null; category: string; modes: string[] };
export type PlanCreator = { workspaceId: string; displayName: string; modes: string[] };
export type PlanLook = { postId: string; creatorWorkspaceId: string; serviceId: string; thumbnailUrl: string | null; caption: string };
export type PlanData = { plan: SavedPlan; services: PlanService[]; creator: PlanCreator | null; look: PlanLook | null; handoff: { look: PlanLook; creator: PlanCreator } | null };

export const emptyPlanFields = (): PlanFields => ({ schemaVersion: 2, lookPostId: null, creatorWorkspaceId: null, serviceIds: [], preferredDate: null,
  timeWindow: null, serviceMode: null, locationArea: "", shortlistProviderWorkspaceIds: [], leadingChoiceProviderWorkspaceId: null });
export const emptySavedPlan = (): SavedPlan => ({ ...emptyPlanFields(), revision: 0, updatedAt: null });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class PlanError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
export function validPlanDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && Number(value.slice(0, 4)) >= 1900;
}
export function planFields(input: unknown, previous?: PlanFields): PlanFields {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new PlanError("Enter a valid plan.");
  const source = input as Record<string, unknown>;
  const allowed = Object.keys(emptyPlanFields());
  if (Object.keys(source).some((key) => !allowed.includes(key)) || allowed.some((key) => !(key in source)) || source.schemaVersion !== 2) throw new PlanError("Use the current plan format.");
  const id = (value: unknown): string | null => {
    if (value === null) return null;
    if (typeof value !== "string" || !uuid.test(value)) throw new PlanError("Choose a valid provider or look.");
    return value.toLowerCase();
  };
  const list = (value: unknown, max: number, providers = false): string[] => {
    if (!Array.isArray(value) || value.length > max || value.some((item) => typeof item !== "string" || (providers ? !uuid.test(item) : !/^[a-z0-9-]{1,60}$/i.test(item)))) throw new PlanError(providers ? "Choose up to three valid providers." : "Choose up to ten valid services.");
    const ids = (value as string[]).map((item) => uuid.test(item) ? item.toLowerCase() : item);
    if (new Set(ids).size !== ids.length) throw new PlanError("Remove duplicate selections.");
    return ids;
  };
  const shortlist = list(source.shortlistProviderWorkspaceIds, 3, true);
  let leading = id(source.leadingChoiceProviderWorkspaceId);
  if (leading && !shortlist.includes(leading)) {
    if (leading === previous?.leadingChoiceProviderWorkspaceId && previous.shortlistProviderWorkspaceIds.includes(leading)) leading = null;
    else throw new PlanError("The leading choice must be in your shortlist.");
  }
  if (source.preferredDate !== null && !validPlanDate(source.preferredDate)) throw new PlanError("Choose a valid calendar date.");
  if (source.timeWindow !== null && (typeof source.timeWindow !== "string" || !["morning", "afternoon", "evening"].includes(source.timeWindow))) throw new PlanError("Choose Morning, Afternoon or Evening.");
  if (source.serviceMode !== null && (typeof source.serviceMode !== "string" || !["salon", "mobile"].includes(source.serviceMode))) throw new PlanError("Choose Salon or Mobile.");
  if (typeof source.locationArea !== "string" || source.locationArea.length > 120 || /[<>\x00-\x1f\x7f]/.test(source.locationArea)) throw new PlanError("Enter a general area using up to 120 characters.");
  return { schemaVersion: 2, lookPostId: id(source.lookPostId), creatorWorkspaceId: id(source.creatorWorkspaceId), serviceIds: list(source.serviceIds, 10),
    preferredDate: source.preferredDate as string | null, timeWindow: source.timeWindow as PlanFields["timeWindow"], serviceMode: source.serviceMode as PlanFields["serviceMode"],
    locationArea: source.locationArea.trim().replace(/\s+/g, " "), shortlistProviderWorkspaceIds: shortlist, leadingChoiceProviderWorkspaceId: leading };
}
export function fieldsFromSaved(plan: SavedPlan): PlanFields {
  const { revision: _revision, updatedAt: _updatedAt, ...fields } = plan;
  return fields;
}
export function readSavedPlan(value: unknown): SavedPlan {
  if (value === undefined || value === null) return emptySavedPlan();
  const plan = value as SavedPlan;
  if (!Number.isSafeInteger(plan.revision) || plan.revision < 1 || typeof plan.updatedAt !== "string" || !Number.isFinite(Date.parse(plan.updatedAt))) throw new PlanError("Your saved plan could not be read.", 500);
  return { ...planFields(fieldsFromSaved(plan)), revision: plan.revision, updatedAt: plan.updatedAt };
}
export function supportedPlanModes(value: unknown): string[] {
  return value === "Both" ? ["salon", "mobile"] : value === "In salon" ? ["salon"] : value === "Mobile" ? ["mobile"] : [];
}
