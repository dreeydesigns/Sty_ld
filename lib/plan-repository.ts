import { authPool } from "@/lib/auth-database";
import { services as catalogue } from "@/lib/site-data";
import { buildCanonicalLook, serviceIdFromTags, type CanonicalLookPost } from "@/lib/look-contract";
import { emptyPlanFields, planFields, readSavedPlan, supportedPlanModes, PlanError, type PlanFields, type SavedPlan, type PlanData, type PlanCreator, type PlanLook, type PlanService } from "@/lib/plan-v2";
import type { PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;
type Provider = { id: string; role: string; profile: Record<string, unknown> };
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const catalogueIds = new Set(catalogue.map((service) => service.id));
async function options(db: Queryable) {
  const { rows } = await db.query(`SELECT s.id, s.workspace_id, s.is_active, s.name, s.price, s.category, w.role, w.profile
    FROM services s JOIN identity_workspaces w ON w.id = s.workspace_id
    WHERE s.is_active = true AND w.status = 'active' AND w.role IN ('professional','salon') ORDER BY s.category, s.name`);
  const real: PlanService[] = rows.map((row) => ({ id: row.id, name: row.name, workspaceId: row.workspace_id,
    price: row.price !== null && Number.isFinite(Number(row.price)) && Number(row.price) >= 0 ? Number(row.price) : null,
    category: row.category || "Services", modes: supportedPlanModes(row.profile?.serviceMode) }));
  return [...real, ...catalogue.map((service) => ({ id: service.id, name: service.name, workspaceId: null, price: null, category: service.category, modes: [] }))];
}
async function providers(db: Queryable, ids: string[]): Promise<Provider[]> {
  if (!ids.length) return [];
  return (await db.query("SELECT id, role, profile FROM identity_workspaces WHERE id = ANY($1::uuid[]) AND status = 'active' AND role IN ('professional','salon')", [ids])).rows;
}
function creator(row?: Provider): PlanCreator | null {
  if (!row) return null;
  const p = row.profile ?? {};
  const name = [p.displayName, p.salonName, p.firstName].find((value) => typeof value === "string" && value.trim());
  return { workspaceId: row.id, displayName: typeof name === "string" ? name.trim().slice(0, 300) : "Creator", modes: supportedPlanModes(p.serviceMode) };
}
async function look(db: Queryable, postId: string | null, services: PlanService[]): Promise<PlanLook | null> {
  if (!postId) return null;
  const row = (await db.query("SELECT * FROM social_posts WHERE id = $1 LIMIT 1", [postId])).rows[0] as CanonicalLookPost | undefined;
  if (!row) return null;
  const linked = services.find((service) => service.id === serviceIdFromTags(row.tags));
  const canonical = buildCanonicalLook(row, linked ? { id: linked.id, workspace_id: linked.workspaceId, is_active: true } : null);
  if (!canonical) return null;
  return { postId: canonical.postId, creatorWorkspaceId: canonical.authorWorkspaceId, serviceId: canonical.serviceId,
    thumbnailUrl: canonical.mediaUrls.find((url) => /^https:\/\//.test(url)) ?? null, caption: canonical.caption };
}
async function workspacePlan(db: Queryable, workspaceId: string, userId: string, lock = false): Promise<SavedPlan> {
  const result = await db.query(`SELECT profile FROM identity_workspaces WHERE id = $1 AND user_id = $2 AND role = 'client' AND status = 'active'${lock ? " FOR UPDATE" : ""}`, [workspaceId, userId]);
  if (!result.rowCount) throw new PlanError("Select an active client workspace.", 403);
  return readSavedPlan(result.rows[0].profile?.activePlan);
}
export async function loadPlan(workspaceId: string, userId: string, incomingLook: string | null = null, incomingCreator: string | null = null): Promise<PlanData> {
  if ((incomingLook && !isUuid(incomingLook)) || (incomingCreator && !isUuid(incomingCreator))) throw new PlanError("This look link is invalid.");
  const plan = await workspacePlan(authPool, workspaceId, userId);
  const services = await options(authPool);
  const currentCreator = creator((await providers(authPool, plan.creatorWorkspaceId ? [plan.creatorWorkspaceId] : []))[0]);
  const currentLook = await look(authPool, plan.lookPostId, services);
  const incoming = await look(authPool, incomingLook, services);
  const incomingProfile = incoming ? creator((await providers(authPool, [incoming.creatorWorkspaceId]))[0]) : null;
  const handoff = incoming && incomingProfile && (!incomingCreator || incomingCreator === incoming.creatorWorkspaceId) ? { look: incoming, creator: incomingProfile } : null;
  return { plan, services, creator: currentCreator, look: currentLook, handoff };
}
export async function updatePlan(workspaceId: string, userId: string, expectedRevision: unknown, input: unknown) {
  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 0) throw new PlanError("Reload your plan before saving.");
  const db = await authPool.connect();
  try {
    await db.query("BEGIN");
    const previous = await workspacePlan(db, workspaceId, userId, true);
    if (previous.revision !== expectedRevision) {
      await db.query("ROLLBACK");
      return { conflict: true as const, plan: previous };
    }
    const fields = planFields(input, previous);
    const services = await options(db);
    const relevantIds = [...new Set([...fields.shortlistProviderWorkspaceIds, ...(fields.creatorWorkspaceId ? [fields.creatorWorkspaceId] : [])])];
    const eligible = await providers(db, relevantIds);
    if (fields.shortlistProviderWorkspaceIds.some((id) => !eligible.some((provider) => provider.id === id))) throw new PlanError("A shortlisted provider is unavailable.");
    if (fields.creatorWorkspaceId && !eligible.some((provider) => provider.id === fields.creatorWorkspaceId) && fields.creatorWorkspaceId !== previous.creatorWorkspaceId) throw new PlanError("This creator is unavailable.");
    for (const id of fields.serviceIds) {
      if (catalogueIds.has(id)) continue;
      const service = services.find((item) => item.id === id && item.workspaceId);
      if (!service && !previous.serviceIds.includes(id)) throw new PlanError("A selected service is unavailable. Remove it or choose another.");
      if (service && fields.creatorWorkspaceId && service.workspaceId !== fields.creatorWorkspaceId) throw new PlanError("This service is not offered by the selected creator.");
      if (!isUuid(id)) throw new PlanError("Choose a valid service.");
    }
    if (fields.lookPostId) {
      const canonical = await look(db, fields.lookPostId, services);
      if (canonical ? canonical.creatorWorkspaceId !== fields.creatorWorkspaceId : fields.lookPostId !== previous.lookPostId || fields.creatorWorkspaceId !== previous.creatorWorkspaceId) throw new PlanError("This look or creator is unavailable.");
    }
    if (fields.serviceMode) {
      const selectedCreator = creator(eligible.find((row) => row.id === fields.creatorWorkspaceId));
      const serviceOwners = fields.serviceIds.map((id) => services.find((service) => service.id === id)).filter((service): service is PlanService => Boolean(service?.workspaceId));
      const modes = selectedCreator ? selectedCreator.modes : serviceOwners.length ? serviceOwners[0].modes : [];
      const preserved = previous.serviceMode === fields.serviceMode && previous.creatorWorkspaceId === fields.creatorWorkspaceId && JSON.stringify(previous.serviceIds) === JSON.stringify(fields.serviceIds);
      if ((!modes.includes(fields.serviceMode) || serviceOwners.some((service) => !service.modes.includes(fields.serviceMode!))) && !preserved) throw new PlanError("This service mode is not supported by the selected provider.");
    }
    const plan: SavedPlan = { ...fields, revision: previous.revision + 1, updatedAt: new Date().toISOString() };
    await db.query("UPDATE identity_workspaces SET profile = jsonb_set(profile, '{activePlan}', $3::jsonb, true) WHERE id = $1 AND user_id = $2 AND role = 'client' AND status = 'active'", [workspaceId, userId, JSON.stringify(plan)]);
    await db.query("COMMIT");
    return { conflict: false as const, plan };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally { db.release(); }
}

export { emptyPlanFields };
