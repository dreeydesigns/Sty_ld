/**
 * Styld, Social Store
 *
 * Browser-local layer for PUBLIC demonstration content only.
 *
 * CONTAINMENT (Phase 8B-A): shared browser storage is not a valid per-account
 * authorisation boundary. Account-associated records, booking requests,
 * direct messages, saves, follows, likes, bookmarks, reposts and archive
 * state, are never read or written here; they fail closed until an
 * authorised, server-backed service exists. Public feed content (posts,
 * comments, share counts) remains browsable as demonstration content, with
 * authorship stamped from the author's own session at creation.
 *
 * Active key (public/demo only):
 *   ms_social_posts, community feed posts (photos + captions)
 *
 * Sync: each write dispatches "ms-social-change" so all listeners update
 * within the same tab, plus a 1.5 s poll catches cross-tab changes.
 */

export const SOCIAL_CHANGE_EVENT = "ms-social-change";

// ─── Saves / Follows ─────────────────────────────────────────────────────────

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

/**
 * CONTAINMENT (Phase 8B-A): a saved/followed list is account-owned state.
 * Every account on the same browser origin shares one browser-local key, so
 * saves cannot be represented as owned by the current signed-in account.
 * These functions fail closed, nothing is read, written or counted, until
 * an authorised, server-backed service exists.
 */
export function readSaves(): SocialSaves {
  return { professionals: [], salons: [] };
}

export function isSaved(_type: "professionals" | "salons", _slug: string): boolean {
  return false;
}

export function toggleSave(_type: "professionals" | "salons", _slug: string): boolean {
  return false;
}

export function getSaveCount(_type: "professionals" | "salons", _slug: string): number {
  return 0;
}

// ─── Feed Posts ───────────────────────────────────────────────────────────────

const POSTS_KEY = "ms_social_posts";

export type PostType = "before_after" | "inspo" | "tip" | "portfolio" | "promotion";

export interface SocialPost {
  id: string;
  authorId: string;          // session id
  authorSlug?: string;       // publicSlug for professionals/salons, used for booking links
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
  archived?: boolean;        // owner-archived
  canonicalId?: string;      // server-backed post id, toggled on/off by user, hides from public feed
  deleted?: boolean;         // soft-deleted, NEVER hard-removed from storage (regulatory tombstone)
  deletedAt?: string;        // ISO timestamp of deletion, audit trail per Kenyan DPA 2019
  /** Team member portfolio attribution, set when a team member uploads work */
  ownedBySalonId?: string;          // salon that owns this image (legal owner)
  creditedToMemberId?: string;      // team member who did the work (credited artist)
  creditedToMemberName?: string;    // denormalized, "by [Name]" shown on the image
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
    // Filter out soft-deleted posts, they stay in storage for regulatory audit but are never shown.
    // 'archived' posts are intentionally kept (owner can un-archive); only 'deleted' are always hidden.
    return all.filter((p) => !p.deleted);
  } catch {
    return [];
  }
}

/** Admin/audit only, returns ALL posts including soft-deleted tombstones. */
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

/**
 * CONTAINMENT (Phase 8B-A): a like, bookmark or repost records the acting
 * account's id in shared browser storage and is surfaced as the current
 * account's own reaction. That ownership cannot be authorised on this
 * transport, so these mutations fail closed. Public like/repost counts that
 * already exist in a post record remain visible; no new state is written.
 */
export function likePost(_postId: string, _userId: string) {
  // Containment: reaction state is not persisted to shared storage.
}

export function repostPost(_postId: string, _userId: string) {
  // Containment: repost state is not persisted to shared storage.
}

export function bookmarkPost(_postId: string, _userId: string) {
  // Containment: bookmark state is not persisted to shared storage.
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
  // traceable audit record. Never call filter() to erase, use the tombstone.
  const all = readAllPostsWithTombstones();
  const updated = all.map((p) => {
    if (p.id !== postId || p.authorId !== ownerId) return p;
    return { ...p, deleted: true, deletedAt: new Date().toISOString() };
  });
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
  dispatch();
}

/**
 * CONTAINMENT (Phase 8B-A): archiving was surfaced as "only you can see it"
 * while writing shared browser storage that every account on the origin can
 * still read. That privacy claim cannot be honoured on this transport, so
 * archiving fails closed. Deleting a post remains available because it is
 * ownership-checked and removes the post from the public feed for everyone.
 */
export function archivePost(_postId: string, _ownerId: string) {
  // Containment: archive state is not persisted to shared storage.
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

/** Pending requests for a pro/salon, unavailable while bookings are contained. */
export function getIncomingBookings(_targetSlug: string): BookingRequest[] {
  return [];
}

/** All bookings sent to a pro/salon (all statuses), unavailable while contained. */
export function getAllProviderBookings(_targetSlug: string): BookingRequest[] {
  return [];
}

/** Get all bookings for a client by their id, unavailable while contained. */
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
 * browser storage, every account on the same origin can read it. Messaging is
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

/**
 * CONTAINMENT (Phase 8B-A): "who you follow" is account-owned state. It was
 * stored in one shared browser-local key, so every account on the origin could
 * read or mutate it and the UI presented it as the current account's own.
 * Following fails closed until an authorised, server-backed service exists.
 */
export function readFollowedAuthors(): string[] {
  return [];
}

export function toggleFollowAuthor(_authorId: string): boolean {
  return false;
}

// ─── Feed starts empty until real users post ────────────────────────────────

export function getUnreadCount(_recipientId: string): number {
  // Containment: no browser-local private threads exist, so nothing is unread.
  return 0;
}

export function markThreadRead(_threadId: string, _recipientId: string) {
  // Containment: there are no browser-local private threads to mark.
}

