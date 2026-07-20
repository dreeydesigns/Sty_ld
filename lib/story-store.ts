/**
 * Mobile Salon — Story Store
 *
 * Stories are ephemeral posts: they expire 24 hours after creation.
 * Each story has a single media item (image or video).
 * Stories are stored in localStorage and read/expired client-side.
 *
 * localStorage key: ms_stories.v1
 */

export const STORY_CHANGE_EVENT = "ms-story-change";
const STORY_KEY = "ms_stories.v1";
const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Types ─────────────────────────────────────────────────────────────────────

export type StoryRole = "client" | "salon" | "professional" | "team_member";

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: StoryRole;
  authorAvatar?: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  createdAt: string;  // ISO
  expiresAt: string;  // ISO — createdAt + 24h
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function canUse(): boolean {
  return typeof window !== "undefined";
}

function dispatch(): void {
  if (canUse()) window.dispatchEvent(new Event(STORY_CHANGE_EVENT));
}

// ─── Storage ───────────────────────────────────────────────────────────────────

function readAllRaw(): Story[] {
  if (!canUse()) return [];
  try {
    return JSON.parse(localStorage.getItem(STORY_KEY) ?? "[]") as Story[];
  } catch {
    return [];
  }
}

function writeAll(stories: Story[]): void {
  if (!canUse()) return;
  localStorage.setItem(STORY_KEY, JSON.stringify(stories));
  dispatch();
}

/** Purge expired stories (older than 24h) and return the remainder */
function purgeExpired(stories: Story[]): Story[] {
  const now = Date.now();
  return stories.filter((s) => new Date(s.expiresAt).getTime() > now);
}

// ─── Public API ────────────────────────────────────────────────────────────────

/** Read all non-expired stories, newest first. Also garbage-collects expired ones. */
export function readStories(): Story[] {
  const all = readAllRaw();
  const live = purgeExpired(all);
  // Persist trimmed list if anything was removed
  if (live.length !== all.length) writeAll(live);
  return live.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Get all non-expired stories for a specific author */
export function getStoriesByAuthor(authorId: string): Story[] {
  return readStories().filter((s) => s.authorId === authorId);
}

/** Add a new story for the current user */
export function addStory(data: {
  authorId: string;
  authorName: string;
  authorRole: StoryRole;
  authorAvatar?: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
}): Story {
  const now = new Date();
  const story: Story = {
    id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...data,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + STORY_TTL_MS).toISOString(),
  };
  writeAll([...readAllRaw(), story]);
  return story;
}

/** Delete a story by ID (author only) */
export function deleteStory(storyId: string): void {
  writeAll(readAllRaw().filter((s) => s.id !== storyId));
}

/** Returns true if the given author already has at least one active story today */
export function hasActiveStory(authorId: string): boolean {
  return readStories().some((s) => s.authorId === authorId);
}
