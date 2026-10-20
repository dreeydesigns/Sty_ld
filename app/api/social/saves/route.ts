import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, AuthError } from "@/lib/auth-resolver";
import { authError, sameOrigin } from "@/lib/api-security";
import { sql } from "@vercel/postgres";
import { saveSocialPost, unsaveSocialPost, readSavedPostIds } from "@/lib/social-saves";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function requireClientWorkspace() {
  const session = await requireAuthenticatedUser();

  if (!session.workspaceId || session.workspace?.role !== "client") {
    throw new AuthError("Private Saves are available for client workspaces only.", 403);
  }

  return session;
}

async function postIsSaveable(postId: string, session: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  const { rows } = await sql`
    SELECT id
    FROM social_posts
    WHERE id = ${postId}
      AND deleted_at IS NULL
      AND (
        (visibility = 'public' AND publication_status = 'published' AND moderation_status = 'visible')
        OR (author_user_id = ${session.userId} AND author_workspace_id = ${session.workspaceId})
      )
    LIMIT 1
  `;

  return rows.length > 0;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await requireClientWorkspace();
    const savedPostIds = await readSavedPostIds(session.workspaceId!, session.userId);
    return NextResponse.json({ ok: true, savedPostIds });
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const session = await requireClientWorkspace();
    const body = (await request.json().catch(() => null)) as { postId?: unknown } | null;

    if (!body || typeof body.postId !== "string" || !isUuid(body.postId)) {
      throw new AuthError("Invalid post reference.", 400);
    }

    if (!(await postIsSaveable(body.postId, session))) {
      throw new AuthError("Post not found.", 404);
    }

    const savedPostIds = await saveSocialPost(session.workspaceId!, session.userId, body.postId);
    return NextResponse.json({ ok: true, savedPostIds });
  } catch (error) {
    return authError(error);
  }
}
