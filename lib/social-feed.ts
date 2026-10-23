import type { CanonicalLook } from "@/lib/look-contract";

export type FeedServiceSummary = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number | null;
  category: string | null;
};

export type FeedPostRow = {
  id: string;
  author_workspace_id: string;
  author_name: string;
  author_slug: string | null;
  author_role: string;
  post_type: string;
  caption: string;
  tags: string[];
  media_urls: string[];
  created_at: string;
  look: CanonicalLook | null;
};

export type InspireLookItem = {
  id: string;
  title: string;
  caption: string;
  category: string;
  postType: string;
  createdAt: string;
  mediaUrls: string[];
  tags: string[];
  authorName: string;
  authorRole: "professional" | "salon";
  authorSlug?: string;
  authorWorkspaceId: string;
  demoFixture: boolean;
  startingPrice: number | null;
  service: FeedServiceSummary | null;
};

const POST_TYPE_LABELS: Record<string, string> = {
  portfolio: "Look",
  before_after: "Before / After",
  inspo: "Inspo",
  tip: "Tip",
  promotion: "Offer",
};

export function postTypeLabel(postType: string): string {
  return POST_TYPE_LABELS[postType] ?? "Look";
}

function summarizeService(row: unknown): FeedServiceSummary | null {
  if (!row || typeof row !== "object") return null;
  const source = row as {
    id?: unknown;
    name?: unknown;
    description?: unknown;
    price?: unknown;
    duration_minutes?: unknown;
    category?: unknown;
  };
  if (typeof source.id !== "string" || typeof source.name !== "string" || !source.name.trim()) return null;
  const price = Number(source.price);
  if (!Number.isFinite(price) || price < 0) return null;
  const durationRaw = Number(source.duration_minutes ?? 0);
  return {
    id: source.id,
    name: source.name.trim(),
    description: typeof source.description === "string" && source.description.trim() ? source.description.trim() : null,
    price,
    durationMinutes: Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : null,
    category: typeof source.category === "string" && source.category.trim() ? source.category.trim() : null,
  };
}

export function summarizeServiceRows(rows: unknown): Map<string, FeedServiceSummary> {
  const map = new Map<string, FeedServiceSummary>();
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    const summary = summarizeService(row);
    if (summary) map.set(summary.id, summary);
  }
  return map;
}

export function toInspireItem(post: FeedPostRow, services: Map<string, FeedServiceSummary>): InspireLookItem | null {
  if (!post || typeof post.id !== "string" || !post.look) return null;
  const look = post.look;
  if (typeof look.serviceId !== "string" || look.serviceId.length === 0) return null;
  if (typeof look.authorWorkspaceId !== "string" || look.authorWorkspaceId.length === 0) return null;
  const service = services.get(look.serviceId) ?? null;
  const caption = typeof look.caption === "string" ? look.caption : "";
  const tags = Array.isArray(look.tags) ? look.tags.map(String) : [];
  const mediaUrls = Array.isArray(look.mediaUrls) ? look.mediaUrls.map(String) : [];
  const authorSlug = typeof look.authorSlug === "string" && look.authorSlug ? look.authorSlug : undefined;
  const authorRole: "professional" | "salon" = look.authorRole === "salon" ? "salon" : "professional";

  return {
    id: String(post.id),
    title: service ? service.name : caption,
    caption,
    category: service && service.category ? service.category : "",
    postType: typeof look.postType === "string" ? look.postType : "portfolio",
    createdAt: String(look.createdAt ?? post.created_at ?? ""),
    mediaUrls,
    tags,
    authorName: typeof look.authorName === "string" ? look.authorName : "",
    authorRole,
    authorSlug,
    authorWorkspaceId: look.authorWorkspaceId,
    demoFixture: Boolean(look.demoProvenance && look.demoProvenance.trusted),
    startingPrice: service ? service.price : null,
    service,
  };
}

export async function loadInspireFeed(options?: { authorWorkspaceId?: string }): Promise<InspireLookItem[]> {
  const query = new URLSearchParams({ limit: "50" });
  if (options && options.authorWorkspaceId) query.set("authorWorkspaceId", options.authorWorkspaceId);

  const [postsResponse, servicesResponse] = await Promise.all([
    fetch(`/api/social/posts?${query.toString()}`),
    fetch("/api/services").catch(() => null),
  ]);

  if (!postsResponse.ok) throw new Error("The looks feed could not be loaded.");
  const postsPayload = (await postsResponse.json().catch(() => null)) as
    | { ok?: boolean; posts?: FeedPostRow[] }
    | null;
  if (!postsPayload || postsPayload.ok !== true || !Array.isArray(postsPayload.posts)) {
    throw new Error("The looks feed response was invalid.");
  }

  const servicesPayload =
    servicesResponse && servicesResponse.ok
      ? await servicesResponse.json().catch(() => null)
      : null;
  const services = summarizeServiceRows(servicesPayload ? servicesPayload.services : null);

  const items: InspireLookItem[] = [];
  for (const post of postsPayload.posts) {
    const item = toInspireItem(post, services);
    if (item) items.push(item);
  }
  return items;
}
