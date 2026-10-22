/**
 * Canonical Look contract for STYLD Build 1.
 *
 * A Look is a published, visible, non-deleted social post authored by a
 * professional or salon workspace that carries exactly one valid service
 * reference tag in the form `svc:<uuid>`. The tag is structured data only.
 * Ownership is always proven by re-checking the referenced service row
 * against the post's server-owned author_workspace_id, never by the tag.
 *
 * The reserved tag `qa:demo` marks trusted QA fixture provenance. The post
 * create API rejects that tag from every authenticated client, so a post can
 * only carry it through an explicitly trusted fixture or founder-run path.
 */

export const SERVICE_TAG_PREFIX = "svc:";
export const RESERVED_DEMO_TAG = "qa:demo";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOOK_AUTHOR_ROLES = new Set(["professional", "salon"]);

export type ServiceRecord = {
  id: string;
  workspace_id: string | null;
  is_active: boolean | null;
};

export type CanonicalLookPost = {
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
  deleted_at: string | Date | null;
  created_at: string | Date;
};

export type CanonicalLook = {
  postId: string;
  authorUserId: string;
  authorWorkspaceId: string;
  authorName: string;
  authorSlug: string | null;
  authorRole: "professional" | "salon";
  postType: string;
  caption: string;
  mediaUrls: string[];
  tags: string[];
  serviceId: string;
  publicationStatus: string;
  moderationStatus: string;
  createdAt: string | Date;
  demoProvenance: { trusted: boolean };
};

export type ServiceTagCheck =
  | { ok: true; serviceId: string | null }
  | { ok: false; error: string; status: 400 | 403 };

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseServiceTag(tag: unknown): string | null {
  if (typeof tag !== "string" || !tag.startsWith(SERVICE_TAG_PREFIX)) return null;
  const id = tag.slice(SERVICE_TAG_PREFIX.length);
  return isUuid(id) ? id.toLowerCase() : null;
}

export function serviceIdFromTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    const id = parseServiceTag(tag);
    if (id) return id;
  }
  return null;
}

export function hasReservedDemoTag(tags: unknown): boolean {
  return Array.isArray(tags) && tags.includes(RESERVED_DEMO_TAG);
}

export function checkServiceTagsForCreate(tags: unknown, authorRole: string): ServiceTagCheck {
  if (!Array.isArray(tags)) return { ok: true, serviceId: null };

  const serviceIds: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    if (tag === RESERVED_DEMO_TAG) {
      return {
        ok: false,
        error: "That reference tag is reserved and cannot be used in posts.",
        status: 400,
      };
    }
    if (!tag.startsWith(SERVICE_TAG_PREFIX)) continue;
    const parsed = parseServiceTag(tag);
    if (!parsed) {
      return {
        ok: false,
        error: "Use a service reference in the form svc:<uuid>.",
        status: 400,
      };
    }
    serviceIds.push(parsed);
  }

  if (serviceIds.length === 0) return { ok: true, serviceId: null };

  if (!LOOK_AUTHOR_ROLES.has(authorRole)) {
    return {
      ok: false,
      error: "Service references are available to professional and salon workspaces only.",
      status: 403,
    };
  }

  if (serviceIds.length > 1) {
    return {
      ok: false,
      error: "A Look can carry at most one service reference.",
      status: 400,
    };
  }

  return { ok: true, serviceId: serviceIds[0] };
}

export function serviceEligibleForLook(service: ServiceRecord | null | undefined, workspaceId: string): boolean {
  return Boolean(
    service &&
      service.id &&
      service.is_active === true &&
      typeof service.workspace_id === "string" &&
      service.workspace_id === workspaceId,
  );
}

export function buildCanonicalLook(
  post: CanonicalLookPost,
  service: ServiceRecord | null | undefined,
): CanonicalLook | null {
  if (post.deleted_at) return null;
  if (post.visibility !== "public") return null;
  if (post.publication_status !== "published") return null;
  if (post.moderation_status !== "visible") return null;
  if (!LOOK_AUTHOR_ROLES.has(post.author_role)) return null;

  const serviceId = serviceIdFromTags(post.tags);
  if (!serviceId) return null;
  if (!service || !serviceEligibleForLook(service, post.author_workspace_id)) return null;
  if (service.id !== serviceId) return null;

  return {
    postId: post.id,
    authorUserId: post.author_user_id,
    authorWorkspaceId: post.author_workspace_id,
    authorName: post.author_name,
    authorSlug: post.author_slug ?? null,
    authorRole: post.author_role as "professional" | "salon",
    postType: post.post_type,
    caption: post.caption,
    mediaUrls: Array.isArray(post.media_urls) ? post.media_urls.map(String) : [],
    tags: Array.isArray(post.tags) ? post.tags.map(String) : [],
    serviceId,
    publicationStatus: post.publication_status,
    moderationStatus: post.moderation_status,
    createdAt: post.created_at,
    demoProvenance: { trusted: hasReservedDemoTag(post.tags) },
  };
}
