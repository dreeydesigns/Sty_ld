/**
 * Mobile Salon — Team Store
 *
 * Manages salon team members: invites, commission splits, and the link between
 * a team member record (stored here) and their session account.
 *
 * Ownership law (hard rule, never broken):
 *   When a team member uploads a portfolio photo, the post belongs to the salon.
 *   The team member is credited as the artist but cannot delete or own the image.
 *   Removing a team member from the salon does NOT delete their contributed images.
 *
 * localStorage key:
 *   ms_team_members.v1  — array of TeamMember records (all salons)
 *
 * Sync: writes dispatch "ms-team-change" so UI listeners update instantly.
 */

export const TEAM_CHANGE_EVENT = "ms-team-change";

const TEAM_KEY = "ms_team_members.v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  /** Unique ID for this team record */
  id: string;
  /** The salon this team member belongs to */
  salonId: string;
  salonName: string;
  salonSlug: string;
  /** Personal details (filled in at invite time — team member can refine) */
  firstName: string;
  phone: string;
  specialty: string;
  servicesOffered: string[];
  profilePhoto?: string;
  bio?: string;
  /** Financial */
  commissionPct: number;   // team member's share (e.g. 20 = 20%)
  /** Invite */
  inviteToken: string;     // UUID token embedded in the invite link
  inviteStatus: "pending" | "accepted";
  /** Set when the team member creates their account and accepts the invite */
  linkedAccountId?: string;
  addedAt: string;         // ISO — when the salon admin added them
  acceptedAt?: string;     // ISO — when they accepted the invite
}

// ─── Internal storage helpers ─────────────────────────────────────────────────

function canUse() {
  return typeof window !== "undefined";
}

function dispatch() {
  if (canUse()) window.dispatchEvent(new Event(TEAM_CHANGE_EVENT));
}

function readAll(): TeamMember[] {
  if (!canUse()) return [];
  try {
    return JSON.parse(localStorage.getItem(TEAM_KEY) ?? "[]") as TeamMember[];
  } catch {
    return [];
  }
}

function writeAll(members: TeamMember[]) {
  if (!canUse()) return;
  localStorage.setItem(TEAM_KEY, JSON.stringify(members));
  dispatch();
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get all team members for a salon (by internal ID) */
export function getTeamMembers(salonId: string): TeamMember[] {
  return readAll().filter((m) => m.salonId === salonId);
}

/** Get accepted team members for a salon's public page (by slug) */
export function getAcceptedTeamBySalonSlug(salonSlug: string): TeamMember[] {
  return readAll().filter((m) => m.salonSlug === salonSlug && m.inviteStatus === "accepted");
}

/** Get a single team member by their account ID (post-accept) */
export function getTeamMemberByAccountId(accountId: string): TeamMember | null {
  return readAll().find((m) => m.linkedAccountId === accountId) ?? null;
}

/** Look up a pending invite by token */
export function getTeamMemberByToken(token: string): TeamMember | null {
  return readAll().find((m) => m.inviteToken === token) ?? null;
}

/**
 * Salon admin adds a new team member.
 * Returns the created record (including the invite token for link generation).
 */
export function addTeamMember(
  salonId: string,
  salonName: string,
  salonSlug: string,
  data: {
    firstName: string;
    phone: string;
    specialty: string;
    commissionPct?: number;
    servicesOffered?: string[];
  },
): TeamMember {
  const member: TeamMember = {
    id: `tm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    salonId,
    salonName,
    salonSlug,
    firstName: data.firstName,
    phone: data.phone,
    specialty: data.specialty,
    servicesOffered: data.servicesOffered ?? [],
    commissionPct: data.commissionPct ?? 20,
    inviteToken: generateToken(),
    inviteStatus: "pending",
    addedAt: new Date().toISOString(),
  };

  writeAll([...readAll(), member]);
  return member;
}

/**
 * Team member accepts the invite link and links their new account.
 * Sets inviteStatus to "accepted" and stores their account ID.
 */
export function acceptInvite(token: string, accountId: string): boolean {
  const all = readAll();
  const idx = all.findIndex((m) => m.inviteToken === token);
  if (idx === -1) return false;

  all[idx] = {
    ...all[idx],
    inviteStatus: "accepted",
    linkedAccountId: accountId,
    acceptedAt: new Date().toISOString(),
  };

  writeAll(all);
  return true;
}

/** Salon admin removes a team member (images stay in salon portfolio) */
export function removeTeamMember(memberId: string) {
  writeAll(readAll().filter((m) => m.id !== memberId));
}

/** Update commission % or services for a team member */
export function updateTeamMember(
  memberId: string,
  updates: Partial<Pick<TeamMember, "commissionPct" | "servicesOffered" | "specialty" | "profilePhoto" | "bio">>,
) {
  const all = readAll();
  const idx = all.findIndex((m) => m.id === memberId);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...updates };
  writeAll(all);
}

/**
 * Generate the invite URL for a team member.
 * The team member pastes this into WhatsApp or SMS.
 */
export function generateInviteUrl(token: string): string {
  if (!canUse()) return `/join-team?token=${token}`;
  return `${window.location.origin}/join-team?token=${token}`;
}

/**
 * Earnings split calculator.
 * Platform always takes 10% first. The remainder is split between the salon and team member.
 *
 * @param totalKES     - gross amount the client paid
 * @param commissionPct - team member's share of the post-platform remainder (default 20)
 * @returns breakdown in KES
 */
export function calcEarningsSplit(
  totalKES: number,
  commissionPct: number,
): { platform: number; member: number; salon: number } {
  const platform = Math.round(totalKES * 0.1);
  const net = totalKES - platform;
  const member = Math.round(net * (commissionPct / 100));
  const salon = net - member;
  return { platform, member, salon };
}

/** MVP: how many freelancer slots does this plan allow? */
export function maxFreelancerSlots(plan: "basic" | "growth" | "premium"): number {
  // All plans get 1 slot in MVP — growth phase will expand this
  if (plan === "premium") {
    return 1;
  }
  return 1;
}
