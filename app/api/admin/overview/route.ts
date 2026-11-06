import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { authError } from '@/lib/api-security';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await requireAdmin();
    const { rows } = await authPool.query(`SELECT
      (SELECT count(*)::int FROM workspace_applications WHERE status='pending' AND role='professional') AS pending_professionals,
      (SELECT count(*)::int FROM workspace_applications WHERE status='pending' AND role='salon') AS pending_salons,
      (SELECT count(*)::int FROM identity_workspaces w JOIN users u ON u.id=w.user_id WHERE w.status='active' AND w.role IN ('professional','salon') AND COALESCE(u.auth_suspended,false)=false AND COALESCE(u.suspended,false)=false AND u.deletion_status='active' AND EXISTS(SELECT 1 FROM workspace_applications a WHERE a.user_id=w.user_id AND a.role=w.role AND a.status='approved')) AS approved_providers,
      (SELECT count(*)::int FROM social_posts WHERE publication_status='pending' AND deleted_at IS NULL) AS pending_content`);
    return NextResponse.json({ ok: true, counts: rows[0] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return authError(error); }
}
