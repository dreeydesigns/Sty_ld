/**
 * JOURNEY-05, the non-binding request to discuss.
 *
 * A client may ask a professional or salon to talk about a Look, a service or a saved plan.
 * Only the provider workspace that received the request may accept or decline it, and only the
 * client who sent it may withdraw it. Acceptance opens permission to discuss. It creates no
 * appointment, holds no slot and commits neither party to a price.
 *
 * Every function takes the database handle and a resolved server session. Nothing here trusts a
 * workspace id supplied by the browser: the client side is the caller's own client workspace and
 * the provider side is checked against the caller's own active workspaces.
 */

export type DiscussionStatus = 'requested' | 'discussion_accepted' | 'declined' | 'withdrawn' | 'expired';

const OPEN: DiscussionStatus = 'requested';
const DECISIONS = new Set(['accept', 'decline', 'withdraw']);
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_NOTE = 600;
const MIN_NOTE = 10;
const MAX_OPEN_PER_DAY = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, any>[]; rowCount: number | null }>;
}

export interface DiscussionActor {
  userId: string;
  workspaceId: string | null;
  role: string;
  workspaces: { id: string; role: string; status?: string }[];
}

export interface DiscussionRequestView {
  id: string;
  status: DiscussionStatus;
  note: string;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
  lookPostId: string | null;
  serviceId: string | null;
  providerName: string;
  clientName: string;
}

export class DiscussionError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = 'DiscussionError';
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function providerWorkspaces(actor: DiscussionActor) {
  return actor.workspaces.filter((workspace) => workspace.role === 'professional' || workspace.role === 'salon');
}

function mapRow(row: Record<string, any>): DiscussionRequestView {
  return {
    id: row.id,
    status: row.status,
    note: row.note,
    createdAt: new Date(row.created_at).toISOString(),
    respondedAt: row.responded_at ? new Date(row.responded_at).toISOString() : null,
    expiresAt: new Date(row.expires_at).toISOString(),
    lookPostId: row.look_post_id ?? null,
    serviceId: row.service_id ?? null,
    providerName: text(row.provider_name) || 'This provider',
    clientName: text(row.client_name) || 'A client',
  };
}

const SELECT_REQUEST = `
  SELECT r.*, u.first_name AS client_name,
    COALESCE(NULLIF(w.profile->>'salonName', ''), NULLIF(w.profile->>'displayName', ''), 'This provider') AS provider_name
  FROM discussion_requests r
  JOIN users u ON u.id = r.client_user_id
  JOIN identity_workspaces w ON w.id = r.provider_workspace_id`;

/** Expiry is checked on read so a stale open row can never be accepted after its window. */
export async function expireStaleRequests(db: Queryable, actor: DiscussionActor, now = new Date()): Promise<number> {
  const result = await db.query(
    `UPDATE discussion_requests SET status = 'expired', responded_at = $3
     WHERE status = 'requested' AND expires_at <= $3
       AND (client_user_id = $1 OR provider_workspace_id = ANY($2::uuid[]))`,
    [actor.userId, providerWorkspaces(actor).map((workspace) => workspace.id), now.toISOString()],
  );
  return result.rowCount ?? 0;
}

export async function createDiscussionRequest(
  db: Queryable,
  actor: DiscussionActor,
  input: { providerWorkspaceId?: unknown; note?: unknown; lookPostId?: unknown; serviceId?: unknown },
  now = new Date(),
): Promise<{ created: boolean; request: DiscussionRequestView }> {
  if (actor.role !== 'client') throw new DiscussionError('Only a client account can send a request.', 403);
  const clientWorkspace = actor.workspaces.find((workspace) => workspace.id === actor.workspaceId && workspace.role === 'client');
  if (!clientWorkspace) throw new DiscussionError('Select an active client workspace first.', 403);

  const providerWorkspaceId = input.providerWorkspaceId;
  if (!isUuid(providerWorkspaceId)) throw new DiscussionError('Choose a provider to ask.');
  const note = text(input.note);
  if (note.length < MIN_NOTE) throw new DiscussionError(`Write at least ${MIN_NOTE} characters so the provider knows what you are asking about.`);
  if (note.length > MAX_NOTE) throw new DiscussionError(`Keep the note under ${MAX_NOTE} characters.`);
  const lookPostId = input.lookPostId == null || input.lookPostId === '' ? null : input.lookPostId;
  const serviceId = input.serviceId == null || input.serviceId === '' ? null : input.serviceId;
  if (lookPostId !== null && !isUuid(lookPostId)) throw new DiscussionError('That Look reference is not valid.');
  if (serviceId !== null && !isUuid(serviceId)) throw new DiscussionError('That service reference is not valid.');

  const provider = (await db.query(
    `SELECT id, user_id, role FROM identity_workspaces
     WHERE id = $1 AND status = 'active' AND role IN ('professional','salon')`,
    [providerWorkspaceId],
  )).rows[0];
  if (!provider) throw new DiscussionError('That provider is not accepting requests.', 404);
  if (provider.user_id === actor.userId) throw new DiscussionError('You cannot send a request to your own workspace.', 403);

  if (lookPostId !== null) {
    const look = (await db.query(
      `SELECT 1 FROM social_posts
       WHERE id = $1 AND author_workspace_id = $2 AND deleted_at IS NULL
         AND visibility = 'public' AND publication_status = 'published' AND moderation_status = 'visible'`,
      [lookPostId, providerWorkspaceId],
    )).rows.length;
    if (!look) throw new DiscussionError('That Look no longer belongs to this provider or is not published.');
  }
  if (serviceId !== null) {
    const service = (await db.query(
      `SELECT 1 FROM services WHERE id = $1 AND workspace_id = $2 AND is_active = true`,
      [serviceId, providerWorkspaceId],
    )).rows.length;
    if (!service) throw new DiscussionError('That service is not offered by this provider.');
  }

  const blocked = (await db.query(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
    [actor.userId, provider.user_id],
  )).rows.length;
  if (blocked) throw new DiscussionError('This conversation is not available.', 403);

  const recent = Number((await db.query(
    `SELECT count(*) AS n FROM discussion_requests WHERE client_user_id = $1 AND created_at > $2`,
    [actor.userId, new Date(now.getTime() - DAY_MS).toISOString()],
  )).rows[0]?.n ?? 0);
  if (recent >= MAX_OPEN_PER_DAY) throw new DiscussionError('You have sent several requests today. Try again tomorrow.', 429);

  const inserted = await db.query(
    `INSERT INTO discussion_requests (client_user_id, client_workspace_id, provider_workspace_id, look_post_id, service_id, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (client_user_id, provider_workspace_id) WHERE status = 'requested' DO NOTHING
     RETURNING *`,
    [actor.userId, clientWorkspace.id, providerWorkspaceId, lookPostId, serviceId, note, now.toISOString()],
  );

  let row = inserted.rows[0];
  const created = Boolean(row);
  if (!row) {
    // Idempotent retry: the same pair already has an open request, so the caller gets that one.
    const existing = (await db.query(
      `${SELECT_REQUEST} WHERE r.client_user_id = $1 AND r.provider_workspace_id = $2 AND r.status = 'requested'`,
      [actor.userId, providerWorkspaceId],
    )).rows[0];
    if (!existing) throw new DiscussionError('A request is already open for this provider.', 409);
    row = existing;
  } else {
    row = (await db.query(`${SELECT_REQUEST} WHERE r.id = $1`, [row.id])).rows[0];
  }
  return { created, request: mapRow(row) };
}

export async function listDiscussionRequests(
  db: Queryable,
  actor: DiscussionActor,
  now = new Date(),
): Promise<{ sent: DiscussionRequestView[]; received: DiscussionRequestView[] }> {
  await expireStaleRequests(db, actor, now);
  const sent = (await db.query(
    `${SELECT_REQUEST} WHERE r.client_user_id = $1 ORDER BY r.created_at DESC LIMIT 50`,
    [actor.userId],
  )).rows.map(mapRow);
  const owned = providerWorkspaces(actor).map((workspace) => workspace.id);
  const received = owned.length
    ? (await db.query(
      `${SELECT_REQUEST} WHERE r.provider_workspace_id = ANY($1::uuid[]) ORDER BY
         CASE r.status WHEN 'requested' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 50`,
      [owned],
    )).rows.map(mapRow)
    : [];
  return { sent, received };
}

export async function respondToDiscussionRequest(
  db: Queryable,
  actor: DiscussionActor,
  requestId: unknown,
  action: unknown,
  now = new Date(),
): Promise<DiscussionRequestView> {
  if (!isUuid(requestId)) throw new DiscussionError('That request is not valid.', 404);
  const decision = text(action);
  if (!DECISIONS.has(decision)) throw new DiscussionError('Choose accept, decline or withdraw.');

  const row = (await db.query('SELECT * FROM discussion_requests WHERE id = $1', [requestId])).rows[0];
  if (!row) throw new DiscussionError('That request was not found.', 404);
  if (row.status !== OPEN) throw new DiscussionError('This request was already decided.', 409);

  const owned = providerWorkspaces(actor);
  const isProvider = owned.some((workspace) => workspace.id === row.provider_workspace_id);
  const isClient = row.client_user_id === actor.userId;

  if (decision === 'withdraw') {
    if (!isClient) throw new DiscussionError('Only the client who sent this request can withdraw it.', 403);
  } else if (!isProvider) {
    throw new DiscussionError('Only the provider this request was sent to can answer it.', 403);
  }
  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    await db.query(`UPDATE discussion_requests SET status = 'expired', responded_at = $2 WHERE id = $1 AND status = 'requested'`, [requestId, now.toISOString()]);
    throw new DiscussionError('This request expired before it was answered.', 409);
  }

  const status: DiscussionStatus = decision === 'accept' ? 'discussion_accepted' : decision === 'decline' ? 'declined' : 'withdrawn';
  const updated = await db.query(
    `UPDATE discussion_requests SET status = $2, responded_at = $3
     WHERE id = $1 AND status = 'requested' RETURNING id`,
    [requestId, status, now.toISOString()],
  );
  if (!updated.rowCount) throw new DiscussionError('This request was already decided.', 409);
  return mapRow((await db.query(`${SELECT_REQUEST} WHERE r.id = $1`, [requestId])).rows[0]);
}
