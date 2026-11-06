import { NextResponse } from 'next/server';
import { authPool } from '@/lib/auth-database';
import { providerActor, saveProviderService, SERVICE_COLUMNS } from '@/lib/provider-services';
import { sameOrigin, authError } from '@/lib/api-security';
import { AuthError } from '@/lib/auth-resolver';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const actor = await providerActor();
    const page=Number(new URL(request.url).searchParams.get('page')||'1');
    if(!Number.isSafeInteger(page)||page<1||page>10000)throw new AuthError('Choose a valid service page.',400);
    const { rows } = await authPool.query(`SELECT ${SERVICE_COLUMNS},count(*) OVER()::int AS total FROM services WHERE workspace_id=$1 AND provider_id=$2 ORDER BY created_at DESC,id LIMIT 50 OFFSET $3`, [actor.workspaceId,actor.userId,(page-1)*50]);
    return NextResponse.json({success:true,workspaceId:actor.workspaceId,services:rows.map(({total:_total,...service})=>service),total:rows[0]?.total||0,page,pageSize:50},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return authError(error); }
}
export async function PATCH(request: Request) {
  try { sameOrigin(request); return NextResponse.json(await saveProviderService(await request.json(),true),{headers:{'Cache-Control':'no-store'}}); }
  catch(error) { return authError(error); }
}
