import { NextResponse } from "next/server";
import { requireAuthenticatedUser, AuthError } from "@/lib/auth-resolver";
import { authError, sameOrigin } from "@/lib/api-security";
import { loadPlan, updatePlan } from "@/lib/plan-repository";
import { PlanError } from "@/lib/plan-v2";

export const dynamic = "force-dynamic";
async function clientSession() {
  const session = await requireAuthenticatedUser();
  if (!session.workspaceId || session.workspace?.role !== "client") throw new AuthError("Select a client workspace to save a plan.", 403);
  return session;
}
function failure(error: unknown) {
  return error instanceof PlanError ? NextResponse.json({ ok: false, error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } }) : authError(error);
}
const etag = (workspaceId: string, revision: number) => `"plan:${workspaceId}:${revision}"`;
export async function GET(request: Request) {
  try {
    const session = await clientSession();
    const params = new URL(request.url).searchParams;
    const data = await loadPlan(session.workspaceId!, session.userId, params.get("look"), params.get("workspace"));
    return NextResponse.json({ ok: true, scopeKey: JSON.stringify([session.userId, session.workspaceId]), ...data }, { headers: { "Cache-Control": "no-store", ETag: etag(session.workspaceId!, data.plan.revision) } });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const session = await clientSession();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["expectedRevision", "plan"].includes(key))) throw new PlanError("Enter a valid plan update.");
    if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) throw new PlanError("Reload your plan before saving.");
    // This is a stale-context precondition. Ownership still comes only from the server session.
    if (request.headers.get("if-match") !== etag(session.workspaceId!, body.expectedRevision)) throw new PlanError("Your workspace changed. Reload this page before saving.", 412);
    const result = await updatePlan(session.workspaceId!, session.userId, body.expectedRevision, body.plan);
    return NextResponse.json({ ok: !result.conflict, scopeKey: JSON.stringify([session.userId, session.workspaceId]), ...(result.conflict ? { code: "PLAN_CONFLICT" } : {}), plan: result.plan }, {
      status: result.conflict ? 409 : 200, headers: { "Cache-Control": "no-store", ETag: etag(session.workspaceId!, result.plan.revision) },
    });
  } catch (error) { return failure(error); }
}
