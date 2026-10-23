import { NextRequest, NextResponse } from "next/server";
import { authPool } from "@/lib/auth-database";
import { isUuid } from "@/lib/look-contract";

const CREATOR_ROLES = new Set(["professional", "salon"]);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanPhotoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= 500 && /^https:\/\//.test(trimmed) ? trimmed : null;
}

/**
 * Public, allowlisted creator profile for a professional or salon workspace.
 * Only fields the workspace itself publishes through profile editing are
 * returned. Contact details and account identifiers never leave this endpoint.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;
    if (!isUuid(workspaceId)) {
      return NextResponse.json({ ok: false, error: "Creator not found." }, { status: 404 });
    }

    const { rows } = await authPool.query(
      `SELECT role, status, profile
      FROM identity_workspaces
      WHERE id = $1
      LIMIT 1`,
      [workspaceId],
    );

    const row = rows[0];
    if (!row || row.status !== "active" || !CREATOR_ROLES.has(row.role)) {
      return NextResponse.json({ ok: false, error: "Creator not found." }, { status: 404 });
    }

    const profile =
      row.profile && typeof row.profile === "object" && !Array.isArray(row.profile)
        ? (row.profile as Record<string, unknown>)
        : {};

    return NextResponse.json({
      ok: true,
      creator: {
        workspaceId,
        role: row.role,
        displayName: cleanText(profile.displayName, 300) ?? cleanText(profile.salonName, 300) ?? cleanText(profile.firstName, 300),
        username: cleanText(profile.username, 80),
        specialty: cleanText(profile.specialty, 200),
        location: cleanText(profile.location, 200),
        serviceMode: cleanText(profile.serviceMode, 80),
        bio: cleanText(profile.bio, 2000),
        photoUrl: cleanPhotoUrl(profile.profilePhoto),
      },
    });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error(
      "GET /api/creators/[workspaceId] error:",
      failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError",
    );
    return NextResponse.json({ ok: false, error: "Could not load creator." }, { status: 500 });
  }
}
