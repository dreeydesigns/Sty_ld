import { NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { authError } from '@/lib/api-security';
import { securityEvent } from '@/lib/security-events';
import { applicationReviewVersion } from '@/lib/application-review';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const actor = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const role = params.get('role') || 'all';
    const status = params.get('status') || 'pending';
    const sort = params.get('sort') || 'oldest';
    const q = (params.get('q') || '').trim();
    const userId = params.get('userId');
    if (userId && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) || role === 'all')) throw new AuthError('Choose a valid application.', 400);
    const page = Number(params.get('page') || '1');
    if (!['all', 'professional', 'salon'].includes(role) || !['all', 'pending', 'approved', 'rejected'].includes(status) || !['oldest', 'newest'].includes(sort) || q.length > 100 || !Number.isSafeInteger(page) || page < 1 || page > 10000) throw new AuthError('Choose valid application filters.', 400);
    const order = sort === 'oldest' ? 'ASC' : 'DESC';
    const result = await authPool.query(`SELECT a.user_id,a.role,a.name,a.description,a.contact,a.status,a.created_at,
      count(*) OVER()::int AS total
      FROM workspace_applications a WHERE a.role IN ('professional','salon')
      AND ($1::text='all' OR a.role=$1) AND ($2::text='all' OR a.status=$2)
      AND ($3::text='' OR a.name ILIKE '%' || $3 || '%') AND ($5::uuid IS NULL OR a.user_id=$5)
      ORDER BY a.created_at ${order},a.user_id,a.role LIMIT 25 OFFSET $4`, [role, status, q, (page - 1) * 25, userId]);
    const audit = userId ? (await authPool.query("SELECT event,created_at,details->>'reason' AS reason FROM security_events WHERE event IN ('admin_approve','admin_reject') AND details->>'target'=$1 AND details->>'role'=$2 ORDER BY created_at DESC,id DESC LIMIT 20", [userId, role])).rows : [];
    await securityEvent('admin_applications_viewed', actor.userId, request.headers, { role, status, page, ...(userId ? { target: userId } : {}) });
    return NextResponse.json({ ok: true, audit, applications: result.rows.map(({ total: _total, ...row }) => ({ ...row, reviewVersion: applicationReviewVersion(row) })), total: result.rows[0]?.total || 0, page, pageSize: 25 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return authError(error); }
}
