/**
 * Styld — Social Store
 *
 * Browser-local layer for non-sensitive demonstration content. Public discovery
 * content (saved pros/salons and community feed posts) is stored on the browser
 * so the demo reflects instantly.
 *
 * CONTAINMENT (Phase 8B-A): account-associated PRIVATE records — booking
 * requests and direct messages — are NO LONGER stored here. Shared browser
 * storage is not a valid per-account authorisation boundary, so messaging and
 * requests now fail closed. See readBookings/sendMessage below.
 *
 * Keys (public/demo only):
 *   ms_social_saves   — which pros/salons a client has saved (followed)
 *   ms_social_posts   — community feed posts (photos + captions)
 *   ms_followed_authors — in-feed follow list
 *
 * Sync: each write dispatches "ms-social-change" so all listeners update
 * within the same tab, plus a 1.5 s poll catches cross-tab changes.
 */

export const SOCIAL_CHANGE_EVENT = "ms-social-change";

// ─── Saves / Follows ─────────────────────────────────────────────────────────

const SAVES_KEY = "ms_social_saves";

export interface SocialSaves {
  professionals: string[]; // slugs
  salons: string[];        // slugs
}

function canUse() {
  return typeof window !== "undefined";
}

function dispatch() {
  if (canUse()) window.dispatchEvent(new Event(SOCIAL_CHANGE_EVENT));
}

export function readSaves(): SocialSaves {
  if (!canUse()) return { professionals: [], salons: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVES_KEY) ?? "{}") as Partial<SocialSaves>;

    return {
      professionals: Array.isArray(parsed.professionals) ? parsed.professionals : [],
      salons: Array.isArray(parsed.salons) ? parsed.salons : [],
    };
  } catch {
    return { professionals: [], salons: [] };
  }
}

export function isSaved(type: "professionals" | "salons", slug: string): boolean {
  const saves = readSaves();
  return (saves[type] ?? []).includes(slug);
}

export function toggleSave(type: "professionals" | "salons", slug: string) {
  const saves = readSaves();
  const list = saves[type] ?? [];
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  const updated: SocialSaves = { ...saves, [type]: next };
  localStorage.setItem(SAVES_KEY, JSON.stringify(updated));
  dispatch();
  return next.includes(slug); // returns new saved state
}

/** Count how many clients have saved a given slug (demo: reads from own saves) */
export function getSaveCount(type: "professionals" | "salons", slug: string): number {
  const saves = readSaves();
  return (saves[type] ?? []).includes(slug) ? 1 : 0;
}

// ─── Feed Posts ───────────────────────────────────────────────────────────────

const POSTS_KEY = "ms_social_posts";

export type PostType = "before_after" | "inspo" | "tip" | "portfolio" | "promotion";

export interface SocialPost {
  id: string;
  authorId: string;          // session id
  authorSlug?: string;       // publicSlug for professionals/salons — used for booking links
  authorName: string;        // display name
  authorAvatar?: string;
  authorRole: "client" | "professional" | "salon";
  location?: string;
  type: PostType;
  images: string[];          // data-URLs or https URLs
  caption: string;
  tags: string[];
  likes: number;
  savedBy: string[];         // session ids who liked/hearted
  bookmarkedBy?: string[];   // session ids who bookmarked
  repostedBy?: string[];     // session ids who reposted
  shareCount?: number;
  comments: SocialComment[];
  createdAt: string;
  archived?: boolean;        // owner-archived — toggled on/off by user, hides from public feed
  deleted?: boolean;         // soft-deleted — NEVER hard-removed from storage (regulatory tombstone)
  deletedAt?: string;        // ISO timestamp of deletion — audit trail per Kenyan DPA 2019
  /** Team member portfolio attribution — set when a team member uploads work */
  ownedBySalonId?: string;          // salon that owns this image (legal owner)
  creditedToMemberId?: string;      // team member who did the work (credited artist)
  creditedToMemberName?: string;    // denormalized — "by [Name]" shown on the image
}

export interface SocialComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
}

export function readPosts(): SocialPost[] {
  if (!canUse()) return [];
  try {
    const all = JSON.parse(localStorage.getItem(POSTS_KEY) ?? "[]") as SocialPost[];
    // Filter out soft-deleted posts — they stay in storage for regulatory audit but are never shown.
    // 'archived' posts are intentionally kept (owner can un-archive); only 'deleted' are always hidden.
    return all.filter((p) => !p.deleted);
  } catch {
    return [];
  }
}

/** Admin/audit only — returns ALL posts including soft-deleted tombstones. */
export function readAllPostsWithTombstones(): SocialPost[] {
  if (!canUse()) return [];
  try {
    return JSON.parse(localStorage.getItem(POSTS_KEY) ?? "[]") as SocialPost[];
  } catch {
    return [];
  }
}

export function writePost(post: SocialPost) {
  const posts = readPosts();
  localStorage.setItem(POSTS_KEY, JSON.stringify([post, ...posts]));
  dispatch();
}

export function likePost(postId: string, userId: string) {
  const posts = readPosts();
  const updated = posts.map((p) => {
    if (p.id !== postId) return p;
    const alreadyLiked = p.savedBy.includes(userId);
    return {
      ...p,
      likes: alreadyLiked ? p.likes - 1 : p.likes + 1,
      savedBy: alreadyLiked ? p.savedBy.filter((id) => id !== userId) : [...p.savedBy, userId],
    };
  });
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
  dispatch();
}

export function repostPost(postId: string, userId: string) {
  const posts = readPosts();
  const updated = posts.map((p) => {
    if (p.id !== postId) return p;
    const repostedBy = p.repostedBy ?? [];
    const alreadyReposted = repostedBy.includes(userId);
    return {
      ...p,
      repostedBy: alreadyReposted ? repostedBy.filter((id) => id !== userId) : [...repostedBy, userId],
    };
  });
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
  dispatch();
}

export function bookmarkPost(postId: string, userId: string) {
  const posts = readPosts();
  const updated = posts.map((p) => {
    if (p.id !== postId) return p;
    const bookmarkedBy = p.bookmarkedBy ?? [];
    const already = bookmarkedBy.includes(userId);
    return {
      ...p,
      bookmarkedBy: already
        ? bookmarkedBy.filter((id) => id !== userId)
        : [...bookmarkedBy, userId],
    };
  });
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
  dispatch();
}

export function sharePost(postId: string) {
  const posts = readPosts();
  const updated = posts.map((p) =>
    p.id === postId ? { ...p, shareCount: (p.shareCount ?? 0) + 1 } : p,
  );
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
  dispatch();
}

export function deletePost(postId: string, ownerId: string) {
  // Soft-delete: mark as deleted rather than removing from storage.
  // Regulatory requirement (Kenyan DPA 2019): all deleted content must leave a
  // traceable audit record. Never call filter() to erase — use the tombstone.
  const all = readAllPostsWithTombstones();
  const updated = all.map((p) => {
    if (p.id !== postId || p.authorId !== ownerId) return p;
    return { ...p, deleted: true, deletedAt: new Date().toISOString() };
  });
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
  dispatch();
}

export function archivePost(postId: string, ownerId: string) {
  const posts = readPosts();
  const updated = posts.map((p) => {
    if (p.id !== postId || p.authorId !== ownerId) return p;
    return { ...p, archived: !p.archived };
  });
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
  dispatch();
}

export function addComment(postId: string, comment: SocialComment) {
  const posts = readPosts();
  const updated = posts.map((p) =>
    p.id === postId ? { ...p, comments: [...p.comments, comment] } : p,
  );
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
  dispatch();
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export type BookingStatus =
  | "draft"
  | "pending"
  | "accepted"
  | "declined"
  | "reschedule_requested"
  | "completed"
  | "cancelled";

export interface BookingRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientAvatar?: string;
  targetType: "professionals" | "salons";
  targetSlug: string;
  targetName: string;
  services: string[];        // service names
  preferredDate: string;     // ISO string
  preferredTime: string;
  location?: string;
  clientGeo?: { lat: number; lng: number };
  totalKES: number;
  notes?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * CONTAINMENT (Phase 8B-A): browser-local booking/request records are shared
 * across every account that uses the same browser origin. That is not a valid
 * authorisation boundary for account-associated requests, so these functions
 * now fail closed: they neither read nor write shared browser storage. Genuine
 * bookings are served exclusively by the authorised /api/bookings endpoint.
 */
export function readBookings(): BookingRequest[] {
  return [];
}

export function writeBooking(_booking: BookingRequest) {
  // Containment: account-associated requests are not persisted to shared storage.
}

export function updateBookingStatus(_id: string, _status: BookingStatus) {
  // Containment: request/booking status cannot be mutated through shared storage.
}

export function rescheduleBooking(_id: string, _date: string, _time: string) {
  // Containment: rescheduling cannot be written to shared storage.
}

/** Pending requests for a pro/salon — unavailable while bookings are contained. */
export function getIncomingBookings(_targetSlug: string): BookingRequest[] {
  return [];
}

/** All bookings sent to a pro/salon (all statuses) — unavailable while contained. */
export function getAllProviderBookings(_targetSlug: string): BookingRequest[] {
  return [];
}

/** Get all bookings for a client by their id — unavailable while contained. */
export function getClientBookings(_clientId: string): BookingRequest[] {
  return [];
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  createdAt: string;
  read: boolean;
}

export interface MessageThread {
  id: string;
  participantIds: string[];
  participantNames: string[];
  participantAvatars: (string | undefined)[];
  messages: Message[];
  lastMessageAt: string;
}

/**
 * CONTAINMENT (Phase 8B-A): private conversations must not be stored in shared
 * browser storage — every account on the same origin can read it. Messaging is
 * therefore disabled until an authorised, server-backed messaging service
 * exists. No threads are read or written, and no delivery is ever simulated.
 */
export function readThreads(): MessageThread[] {
  return [];
}

export function sendMessage(
  _threadId: string,
  _message: Message,
  _participants?: Omit<MessageThread, "messages" | "lastMessageAt">,
) {
  // Containment: private messages are never written to shared browser storage.
}

export function getOrCreateThreadId(idA: string, idB: string): string {
  return [idA, idB].sort().join("_");
}

// ─── Followed authors (in-feed follow, separate from profile saves) ──────────

const FOLLOWED_AUTHORS_KEY = "ms_followed_authors";

export function readFollowedAuthors(): string[] {
  if (!canUse()) return [];
  try {
    return JSON.parse(localStorage.getItem(FOLLOWED_AUTHORS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function toggleFollowAuthor(authorId: string): boolean {
  const list = readFollowedAuthors();
  const alreadyFollowing = list.includes(authorId);
  const next = alreadyFollowing ? list.filter((id) => id !== authorId) : [...list, authorId];
  localStorage.setItem(FOLLOWED_AUTHORS_KEY, JSON.stringify(next));
  dispatch();
  return !alreadyFollowing; // returns new following state
}

// ─── Feed starts empty until real users post ────────────────────────────────

export function getUnreadCount(_recipientId: string): number {
  // Containment: no browser-local private threads exist, so nothing is unread.
  return 0;
}

export function markThreadRead(_threadId: string, _recipientId: string) {
  // Containment: there are no browser-local private threads to mark.
}

