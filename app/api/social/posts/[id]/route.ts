import { NextRequest, NextResponse } from "next/server";
import { authPool } from "@/lib/auth-database";
import { requireAuthenticatedUser, AuthError } from "@/lib/auth-resolver";
import { authError, sameOrigin } from "@/lib/api-security";
import {
  buildCanonicalLook,
  serviceIdFromTags,
  type ServiceRecord,
} from "@/lib/look-contract";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
    }

    const session = await (async () => {
      try {
        return await requireAuthenticatedUser();
      } catch {
        return null;
      }
    })();

    const { rows } = await authPool.query(
      `SELECT
        id,
        author_user_id,
        author_workspace_id,
        author_name,
        author_slug,
        author_role,
        post_type,
        caption,
        tags,
        media_urls,
        visibility,
        publication_status,
        moderation_status,
        created_at,
        deleted_at
      FROM social_posts
      WHERE id = $1
      LIMIT 1`,
      [id],
    );

    if (rows.length === 0 || rows[0].deleted_at) {
      return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
    }

    const post = rows[0];
    const isOwner = Boolean(session && session.userId === post.author_user_id && session.workspaceId === post.author_workspace_id);

    if (post.visibility !== "public" || post.publication_status !== "published" || post.moderation_status !== "visible") {
      if (!isOwner) {
        return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
      }
    }

    let service: ServiceRecord | null = null;
    const serviceId = serviceIdFromTags(post.tags);
    if (serviceId) {
      const serviceResult = await authPool.query(
        `SELECT id, workspace_id, is_active FROM services WHERE id = $1`,
        [serviceId],
      );
      service = (serviceResult.rows[0] as ServiceRecord) ?? null;
    }

    return NextResponse.json({ ok: true, post: { ...post, look: buildCanonicalLook(post, service) } });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error("GET /api/social/posts/[id] error:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
    return NextResponse.json({ ok: false, error: "Could not load post." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const session = await requireAuthenticatedUser();
    const { id } = await context.params;

    if (!isUuid(id)) {
      return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
    }

    const { rows } = await authPool.query(
      `UPDATE social_posts
      SET deleted_at = now(), updated_at = now()
      WHERE id = $1
        AND author_user_id = $2
        AND author_workspace_id = $3
        AND deleted_at IS NULL
      RETURNING id`,
      [id, session.userId, session.workspaceId],
    );

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return authError(error);
  }
}
