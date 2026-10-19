/**
 * POST /api/init
 *
 * Decommissioned. Remote database initialization and schema migration over
 * HTTP is disabled and always fails closed with 410 Gone, regardless of
 * environment variables or supplied headers. No schema change is attempted.
 * Migrations are applied only through the founder-controlled local migration
 * scripts after separate approval.
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Remote database initialization is disabled. No schema change was attempted. Use the founder-controlled local migration scripts.",
    },
    { status: 410 }
  );
}
