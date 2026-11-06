import { NextResponse } from 'next/server';
import { authPool } from '@/lib/auth-database';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth-resolver';
import { sameOrigin, authError } from '@/lib/api-security';
import { PROVIDER_PUBLICATION_UPDATE, PUBLIC_PROVIDER_PREDICATE, publicArea } from '@/lib/public-discovery';

async function listingStatus(workspaceId: string, userId: string) {
  const result = await authPool.query(`SELECT w.profile, (${PUBLIC_PROVIDER_PREDICATE}) AS listed FROM identity_workspaces w JOIN users u ON u.id=w.user_id WHERE w.id=$1 AND w.user_id=$2 AND w.status='active'`, [workspaceId, userId]);
  const row = result.rows[0];
  if (!row) throw new AuthError('Workspace unavailable.', 403);
  return { ok: true, workspaceId, enabled: row.profile?.publicDiscoveryEnabled === true, listed: row.listed === true, area: publicArea(row.profile?.publicArea) };
}

export async function GET() {
  try {
    const actor = await requireAuthenticatedUser();
    if (!actor.workspaceId || !actor.workspace || !['professional', 'salon'].includes(actor.workspace.role)) throw new AuthError('Select a provider workspace.', 403);
    return NextResponse.json(await listingStatus(actor.workspaceId, actor.userId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return authError(error); }
}

export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requireAuthenticatedUser();
    if (!actor.workspaceId || !actor.workspace || !['professional', 'salon'].includes(actor.workspace.role) || (actor.admin && !actor.mfaVerified)) throw new AuthError('Select an authorised provider workspace.', 403);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['enabled', 'area', 'expectedWorkspaceId'].includes(key)) || typeof body.enabled !== 'boolean') throw new AuthError('Choose whether to publish your profile.', 400);
    if (body.expectedWorkspaceId !== actor.workspaceId) throw new AuthError('Workspace changed. Reload listing settings.', 409);
    const area = body.enabled ? publicArea(body.area) : null;
    if (body.enabled && !area) throw new AuthError('Choose a listed area for your public profile.', 400);
    const client = await authPool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SET LOCAL idle_in_transaction_session_timeout = '5s'");
      const saved = await client.query(PROVIDER_PUBLICATION_UPDATE, [actor.workspaceId, actor.userId, body.enabled, area]);
      if (!saved.rowCount) throw new AuthError('This provider workspace cannot be published.', 403);
      await client.query("INSERT INTO security_events(user_id,event,details) VALUES($1,'provider_publication_changed',$2::jsonb)", [actor.userId, JSON.stringify({ workspaceId: actor.workspaceId, enabled: body.enabled, area })]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
    return NextResponse.json(await listingStatus(actor.workspaceId, actor.userId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return authError(error); }
}
