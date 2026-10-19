export const SUPPORTED_TOUR_ROLES = [
  "client",
  "professional",
  "salon",
  "super_admin",
] as const;

export type SupportedTourRole = (typeof SUPPORTED_TOUR_ROLES)[number];

export interface ServerTourSession {
  user_id?: string | null;
  assumed_role?: string | null;
  workspaceId?: string | null;
  available_roles?: string[] | null;
  admin?: boolean;
  mfaVerified?: boolean;
}

export interface TourAuthorization {
  userId: string;
  role: SupportedTourRole;
  workspaceId: string | null;
  scopeKey: string;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveTourAuthorization(
  session: ServerTourSession | null | undefined
): TourAuthorization | null {
  const userId = clean(session?.user_id);
  const role = clean(session?.assumed_role);
  if (!userId || !role) return null;

  if (role === "super_admin") {
    if (session?.admin !== true || session?.mfaVerified !== true) return null;
    return {
      userId,
      role,
      workspaceId: null,
      scopeKey: "role:super_admin",
    };
  }

  if (role !== "client" && role !== "professional" && role !== "salon") {
    return null;
  }

  const workspaceId = clean(session?.workspaceId) || null;
  return {
    userId,
    role,
    workspaceId,
    scopeKey: workspaceId ? `workspace:${workspaceId}:${role}` : `role:${role}`,
  };
}
