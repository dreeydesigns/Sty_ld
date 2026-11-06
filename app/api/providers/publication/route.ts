import { NextResponse } from 'next/server';
import { authPool } from '@/lib/auth-database';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth-resolver';
import { sameOrigin, authError } from '@/lib/api-security';
import { PROVIDER_PUBLICATION_UPDATE, publicArea } from '@/lib/public-discovery';

export async function GET() {
  try {
    const actor = await requireAuthenticatedUser();
    if (!actor.workspaceId || !actor.workspace || !['professional', 'salon'].includes(actor.workspace.role)) throw new AuthError('Select a provider workspace.', 403);
    const result = await authPool.query("SELECT profile FROM identity_workspaces WHERE id=$1 AND user_id=$2 AND status='active'", [actor.workspaceId, actor.userId]);
    if (!result.rows[0]) throw new AuthError('Workspace unavailable.', 403);
    const profile = result.rows[0].profile || {};
    return NextResponse.json({ ok: true, enabled: profile.publicDiscoveryEnabled === true, area: publicArea(profile.publicArea) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return authError(error); }
}

export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requireAuthenticatedUser();
    if (!actor.workspaceId || !actor.workspace || !['professional', 'salon'].includes(actor.workspace.role) || (actor.admin && !actor.mfaVerified)) throw new AuthError('Select an authorised provider workspace.', 403);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['enabled', 'area'].includes(key)) || typeof body.enabled !== 'boolean') throw new AuthError('Choose whether to publish your profile.', 400);
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
    return NextResponse.json({ ok: true, enabled: body.enabled, area }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return authError(error); }
}
