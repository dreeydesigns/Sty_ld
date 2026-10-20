import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, AuthError } from "@/lib/auth-resolver";
import { authError, sameOrigin } from "@/lib/api-security";
import { unsaveSocialPost } from "@/lib/social-saves";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    sameOrigin(request);
    const session = await requireAuthenticatedUser();

    if (!session.workspaceId || session.workspace?.role !== "client") {
      throw new AuthError("Private Saves are available for client workspaces only.", 403);
    }

    const { postId } = await context.params;

    if (!isUuid(postId)) {
      return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
    }

    const savedPostIds = await unsaveSocialPost(session.workspaceId, session.userId, postId);
    return NextResponse.json({ ok: true, savedPostIds });
  } catch (error) {
    return authError(error);
  }
}
