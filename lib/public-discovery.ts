import { marketAreas } from '@/lib/site-data';
import { listedPriceInCents } from '@/lib/plan-offer.cjs';

export const PUBLIC_PROVIDER_PREDICATE = `w.status='active' AND w.role IN ('professional','salon')
  AND COALESCE(u.auth_suspended,false)=false AND COALESCE(u.suspended,false)=false
  AND u.deletion_status='active'
  AND w.profile->'publicDiscoveryEnabled'='true'::jsonb
  AND jsonb_typeof(w.profile->'publicDiscoveryChangedAt')='string'
  AND COALESCE(NULLIF(BTRIM(w.profile->>'displayName'),''),NULLIF(BTRIM(w.profile->>'salonName'),'')) IS NOT NULL
  AND w.profile->>'publicArea'=ANY(ARRAY[${marketAreas.map(area => `'${area.replaceAll("'", "''")}'`).join(',')}])
  AND EXISTS (SELECT 1 FROM workspace_applications a WHERE a.user_id=w.user_id AND a.role=w.role AND a.status='approved')`;

type Queryable = { query: (sql: string, parameters?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function text(value: unknown, maximum: number): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maximum) : null;
}
export function publicArea(value: unknown): string | null {
  return typeof value === 'string' && (marketAreas as readonly string[]).includes(value) ? value : null;
}
export function publicProvider(row: Record<string, unknown>) {
  const p = row.profile && typeof row.profile === 'object' && !Array.isArray(row.profile) ? row.profile as Record<string, unknown> : {};
  const displayName = text(p.displayName, 300) || text(p.salonName, 300);
  const area = publicArea(p.publicArea);
  if (!displayName || !area || !['professional', 'salon'].includes(String(row.role)) || p.publicDiscoveryEnabled !== true || typeof p.publicDiscoveryChangedAt !== 'string') return null;
  return { workspaceId: row.id as string, role: row.role as 'professional' | 'salon', displayName, specialty: text(p.specialty, 200), area };
}
export function publicService(row: Record<string, unknown>) {
  if (typeof row.name !== 'string' || !row.name.trim()) return null;
  const cents = listedPriceInCents(row.price);
  return { id: row.id as string, workspaceId: row.workspace_id as string, name: row.name.trim().slice(0, 100), category: text(row.category, 100), price: cents === null ? null : cents / 100, durationMinutes: typeof row.duration_minutes === 'number' && Number.isSafeInteger(row.duration_minutes) && row.duration_minutes > 0 ? row.duration_minutes : null };
}
export async function readPublicDiscovery(db: Queryable, workspaceId?: string) {
  if (workspaceId !== undefined && !UUID.test(workspaceId)) return { providers: [], services: [] };
  const selected = workspaceId ? ' AND w.id=$1' : '';
  const parameters = workspaceId ? [workspaceId] : [];
  const providers = (await db.query(`SELECT w.id,w.role,w.profile FROM identity_workspaces w JOIN users u ON u.id=w.user_id WHERE ${PUBLIC_PROVIDER_PREDICATE}${selected} ORDER BY w.created_at,w.id LIMIT 100`, parameters)).rows.map(publicProvider).filter((p): p is NonNullable<typeof p> => p !== null);
  if (!providers.length) return { providers, services: [] };
  // Recheck eligibility in the service query so withdrawal or suspension cannot expose orphan offers.
  const services = (await db.query(`SELECT s.id,s.workspace_id,s.name,s.category,s.price,s.duration_minutes FROM services s JOIN identity_workspaces w ON w.id=s.workspace_id JOIN users u ON u.id=w.user_id WHERE s.is_active=true AND ${PUBLIC_PROVIDER_PREDICATE} AND w.id=ANY($1::uuid[]) ORDER BY s.category,s.name,s.id LIMIT 1000`, [providers.map(p => p.workspaceId)])).rows.map(publicService).filter((s): s is NonNullable<typeof s> => s !== null);
  return { providers, services };
}

export const PROVIDER_PUBLICATION_UPDATE = `UPDATE identity_workspaces w SET profile=profile || jsonb_build_object('publicDiscoveryEnabled',$3::boolean,'publicArea',$4::text,'publicDiscoveryChangedAt',now()::text)
 WHERE w.id=$1 AND w.user_id=$2 AND w.status='active' AND w.role IN ('professional','salon')
 AND EXISTS (SELECT 1 FROM users u WHERE u.id=w.user_id AND COALESCE(u.auth_suspended,false)=false AND COALESCE(u.suspended,false)=false AND u.deletion_status='active')
 AND ($3::boolean=false OR EXISTS (SELECT 1 FROM workspace_applications a WHERE a.user_id=w.user_id AND a.role=w.role AND a.status='approved'))
 AND ($3::boolean=false OR COALESCE(NULLIF(BTRIM(w.profile->>'displayName'),''),NULLIF(BTRIM(w.profile->>'salonName'),'')) IS NOT NULL)
 RETURNING profile`;
