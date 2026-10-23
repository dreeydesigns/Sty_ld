import { NextRequest, NextResponse } from "next/server";
import { authPool } from "@/lib/auth-database";
import { requireAuthenticatedUser, AuthError } from "@/lib/auth-resolver";
import { authError, sameOrigin } from "@/lib/api-security";
import {
  buildCanonicalLook,
  checkServiceTagsForCreate,
  serviceIdFromTags,
  type ServiceRecord,
} from "@/lib/look-contract";

const POST_TYPES = new Set(["before_after", "inspo", "tip", "portfolio", "promotion"]);
const AUTHOR_ROLES = new Set(["client", "professional", "salon"]);
const MAX_CAPTION_LENGTH = 2000;
const MAX_TAGS = 10;
const MAX_MEDIA = 4;
const MAX_PAGE_SIZE = 50;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parsePositiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

function validMediaUrl(url: string, cloudName: string | undefined) {
  if (!cloudName || typeof url !== "string" || url.length > 500) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloudName}/image/`)
    );
  } catch {
    return false;
  }
}

function validTag(tag: unknown) {
  return typeof tag === "string" && tag.length > 0 && tag.length <= 40;
}

function authorName(session: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  const profile = session.workspace?.profile ?? {};
  const displayName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
  const firstName = typeof session.firstName === "string" ? session.firstName.trim() : "";
  return (displayName || firstName || "Styld member").slice(0, 120);
}

function authorSlug(session: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  const profile = session.workspace?.profile ?? {};
  const slug = typeof profile.publicSlug === "string" ? profile.publicSlug.trim() : "";
  return slug || null;
}

type PostRow = {
  id: string;
  author_user_id: string;
  author_workspace_id: string;
  author_name: string;
  author_slug: string | null;
  author_role: string;
  post_type: string;
  caption: string;
  tags: string[];
  media_urls: string[];
  visibility: string;
  publication_status: string;
  moderation_status: string;
  created_at: string | Date;
  deleted_at: string | Date | null;
};

async function attachCanonicalLooks(posts: PostRow[]) {
  const serviceIds = new Set<string>();
  for (const post of posts) {
    const serviceId = serviceIdFromTags(post.tags);
    if (serviceId) serviceIds.add(serviceId);
  }

  const serviceById = new Map<string, ServiceRecord>();
  if (serviceIds.size > 0) {
    const { rows } = await authPool.query(
      `SELECT id, workspace_id, is_active FROM services WHERE id = ANY($1::uuid[])`,
      [[...serviceIds]],
    );
    for (const row of rows as ServiceRecord[]) serviceById.set(row.id, row);
  }

  return posts.map((post) => {
    const serviceId = serviceIdFromTags(post.tags);
    const service = serviceId ? serviceById.get(serviceId) : undefined;
    return { ...post, look: buildCanonicalLook(post, service ?? null) };
  });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parsePositiveInteger(url.searchParams.get("limit"), 20, MAX_PAGE_SIZE);
    const offset = parsePositiveInteger(url.searchParams.get("offset"), 0, 100000);
    const idsParam = url.searchParams.get("ids");
    const authorWorkspaceId = url.searchParams.get("authorWorkspaceId");

    if (authorWorkspaceId !== null && !isUuid(authorWorkspaceId)) {
      return NextResponse.json({ ok: false, error: "Invalid creator reference." }, { status: 400 });
    }

    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (ids.length === 0 || ids.length > 100 || ids.some((id) => !isUuid(id))) {
        return NextResponse.json({ ok: false, error: "Invalid post reference." }, { status: 400 });
      }

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
        WHERE id = ANY($1::uuid[])
          AND deleted_at IS NULL
          AND visibility = 'public'
          AND publication_status = 'published'
          AND moderation_status = 'visible'`,
        [ids],
      );

      const posts = await attachCanonicalLooks(rows as PostRow[]);
      return NextResponse.json({ ok: true, posts });
    }

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
      WHERE deleted_at IS NULL
        AND visibility = 'public'
        AND publication_status = 'published'
        AND moderation_status = 'visible'
        AND ($3::uuid IS NULL OR author_workspace_id = $3)
      ORDER BY created_at DESC
      LIMIT $1
      OFFSET $2`,
      [limit, offset, authorWorkspaceId],
    );

    const posts = await attachCanonicalLooks(rows as PostRow[]);
    return NextResponse.json({ ok: true, posts, limit, offset });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error("GET /api/social/posts error:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
    return NextResponse.json({ ok: false, error: "Could not load posts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const session = await requireAuthenticatedUser();

    if (!session.workspaceId || !session.workspace || !AUTHOR_ROLES.has(session.workspace.role)) {
      throw new AuthError("Post creation is available to authorized creator workspaces only.", 403);
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AuthError("Invalid post.", 400);
    }

    const postType = body.postType;
    if (typeof postType !== "string" || !POST_TYPES.has(postType)) {
      throw new AuthError("Choose a valid post type.", 400);
    }

    const caption = typeof body.caption === "string" ? body.caption.trim() : "";
    if (caption.length < 1 || caption.length > MAX_CAPTION_LENGTH) {
      throw new AuthError("Enter a caption between 1 and 2000 characters.", 400);
    }

    const tags = Array.isArray(body.tags) ? body.tags : [];
    if (tags.length > MAX_TAGS || tags.some((tag) => !validTag(tag))) {
      throw new AuthError("Use up to 10 tags of 40 characters or fewer.", 400);
    }

    const tagCheck = checkServiceTagsForCreate(tags, session.workspace.role);
    if (!tagCheck.ok) {
      throw new AuthError(tagCheck.error, tagCheck.status);
    }

    if (tagCheck.serviceId) {
      const serviceResult = await authPool.query(
        `SELECT id, workspace_id, is_active FROM services WHERE id = $1`,
        [tagCheck.serviceId],
      );
      const service = serviceResult.rows[0] as ServiceRecord | undefined;
      if (!service) {
        throw new AuthError("Service reference unavailable.", 400);
      }
      if (service.is_active !== true) {
        throw new AuthError("Service reference is not active.", 400);
      }
      if (service.workspace_id !== session.workspaceId) {
        throw new AuthError("Service reference belongs to another workspace.", 403);
      }
    }

    const mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls : [];
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (mediaUrls.length > MAX_MEDIA || mediaUrls.some((url) => !validMediaUrl(String(url), cloudName))) {
      throw new AuthError("Use validated Cloudinary image references only.", 400);
    }

    if (caption.length === 0 && mediaUrls.length === 0) {
      throw new AuthError("A post needs a caption or an image.", 400);
    }

    const visibility = body.visibility === "private" ? "private" : "public";
    const author = authorName(session);
    const slug = authorSlug(session);

    const { rows } = await authPool.query(
      `INSERT INTO social_posts (
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
        publication_status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::text[],
        $9::text[],
        $10,
        'pending'
      )
      RETURNING
        id,
        author_name,
        author_slug,
        author_role,
        post_type,
        caption,
        tags,
        media_urls,
        visibility,
        publication_status,
        created_at`,
      [
        session.userId,
        session.workspaceId,
        author,
        slug,
        session.workspace.role,
        postType,
        caption,
        tags,
        mediaUrls.map(String),
        visibility,
      ],
    );

    return NextResponse.json({ ok: true, post: rows[0] }, { status: 201 });
  } catch (error) {
    return authError(error);
  }
}
