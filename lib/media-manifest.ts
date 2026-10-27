import { authPool } from './auth-database';

// Server-owned reads for the restricted media manifest. The delivery rules themselves
// live in lib/pending-media-policy.cjs; this module only turns a row into the shape
// those rules expect, and refuses anything that does not look like a real record.

export interface PendingMediaRecord {
  assetId: string;
  providerPublicId: string;
  ownerWorkspaceId: string;
  version: number;
  state: string;
  deliveryType: string;
  providerRestrictionVerified: boolean;
  revoked: boolean;
  publicDerivativeVerified: boolean;
  approvedVersion: number | null;
  accessExpiresAt: number;
}

const identifier = /^[A-Za-z0-9_-]{1,100}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const states = ['pending', 'published', 'rejected', 'deleted'];
const deliveryTypes = ['authenticated', 'public'];

function text(value: unknown, pattern: RegExp, maximum: number): string | null {
  if (typeof value !== 'string') return null;
  if (!pattern.test(value) || value.length > maximum) return null;
  return value;
}

function flag(value: unknown): boolean | null {
  // pg returns true/false for a NOT NULL boolean; anything else is a broken driver
  // or a broken column, and a guess here would hand bytes to the wrong person.
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === 't') return true;
  if (value === 0 || value === 'f') return false;
  return null;
}

function wholeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function epochMs(value: unknown): number {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function mapPendingMediaRecord(row: Record<string, unknown> | undefined | null): PendingMediaRecord | null {
  if (!row || typeof row !== 'object') return null;
  const assetId = text(row.asset_id, identifier, 100);
  const providerPublicId = typeof row.provider_public_id === 'string' && row.provider_public_id.length <= 200 ? row.provider_public_id : null;
  const ownerWorkspaceId = text(row.owner_workspace_id, uuid, 36);
  const version = wholeNumber(row.version);
  const state = typeof row.state === 'string' && states.includes(row.state) ? row.state : null;
  const deliveryType = typeof row.delivery_type === 'string' && deliveryTypes.includes(row.delivery_type) ? row.delivery_type : null;
  const restriction = flag(row.provider_restriction_verified);
  const revoked = flag(row.revoked);
  const derivative = flag(row.public_derivative_verified);
  if (!assetId || !providerPublicId || !ownerWorkspaceId || !version || !state || !deliveryType) return null;
  if (restriction === null || revoked === null || derivative === null) return null;
  const approved = row.approved_version === null || row.approved_version === undefined ? null : wholeNumber(row.approved_version);
  if (row.approved_version !== null && row.approved_version !== undefined && approved === null) return null;
  return Object.freeze({
    assetId,
    providerPublicId,
    ownerWorkspaceId,
    version,
    state,
    deliveryType,
    providerRestrictionVerified: restriction,
    revoked,
    publicDerivativeVerified: derivative,
    approvedVersion: approved,
    accessExpiresAt: epochMs(row.access_expires_at),
  });
}

const COLUMNS = `asset_id, provider_public_id, owner_workspace_id, version, state, delivery_type,
  provider_restriction_verified, revoked, public_derivative_verified, approved_version, access_expires_at`;

// The two statements this module owns, expressed as a seam so the regression suite can
// drive them against a recording stand-in. Production calls take the one real pool.
export interface ManifestQuery { rows: Record<string, unknown>[]; rowCount: number | null }
export interface ManifestStore {
  query(sql: string, values?: unknown[]): Promise<ManifestQuery>;
  connect(): Promise<{ query(sql: string, values?: unknown[]): Promise<ManifestQuery>; release(): void }>;
}

// A missing row and a malformed row are the same answer to a client: nothing exists
// here. Only the log keeps the difference, and only without identifiers.
export async function findPendingMedia(assetId: string, db: ManifestStore = authPool): Promise<PendingMediaRecord | null> {
  if (typeof assetId !== 'string' || !identifier.test(assetId)) return null;
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM media_manifests WHERE asset_id = $1`, [assetId]);
  const record = mapPendingMediaRecord(rows[0]);
  if (!record && rows.length) console.warn('[media] manifest row rejected by validation');
  return record;
}

export interface MediaActor {
  userId: string;
  sessionId: string;
  role: string;
  active: boolean;
  workspaceId: string | null;
  mfaVerified: boolean;
  canReviewMedia: boolean;
}

export type AccessWindowResult = 'granted' | 'forbidden' | 'not_available';

// The window length is a verified configuration value, never a client value. It is
// still clamped to a whole number of seconds inside the five minute ceiling the
// migration repeats as a database constraint, so the literal below is provably safe.
function windowSql(seconds: number): string {
  const bounded = Math.max(1, Math.min(300, Math.trunc(seconds)));
  if (!Number.isSafeInteger(bounded)) throw new Error('Invalid access window.');
  return `UPDATE media_manifests
     SET access_granted_at = now(),
         access_expires_at = now() + make_interval(secs => ${bounded}),
         updated_at = now()
   WHERE asset_id = $1
     AND state = 'pending'
     AND revoked = false
     AND delivery_type = 'authenticated'
     AND provider_restriction_verified = true`;
}

// Authority is expressed in the WHERE clause from server-derived values only, so no
// request body or query string can name a different owner.
export async function openPendingAccessWindow(assetId: string, actor: MediaActor, seconds: number, db: ManifestStore = authPool): Promise<AccessWindowResult> {
  if (typeof assetId !== 'string' || !identifier.test(assetId) || !actor?.active) return 'not_available';
  const owner = actor.workspaceId && uuid.test(actor.workspaceId) && ['professional', 'salon'].includes(actor.role)
    ? ` AND owner_workspace_id = $2`
    : null;
  const reviewer = actor.role === 'super_admin' && actor.mfaVerified && actor.canReviewMedia;
  if (!owner && !reviewer) return 'forbidden';
  const values = owner ? [assetId, actor.workspaceId] : [assetId];
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '5s'");
    const { rowCount } = await client.query(`${windowSql(seconds)}${owner ?? ''} RETURNING 1`, values);
    await client.query('COMMIT');
    return rowCount ? 'granted' : 'not_available';
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    const code = (error as { code?: string })?.code;
    if (code === '55P03' || code === '40P01') return 'not_available';
    console.error('[media] access window update failed:', (error as { code?: string })?.code || (error as Error)?.name || 'UnknownError');
    return 'not_available';
  } finally {
    client.release();
  }
}
