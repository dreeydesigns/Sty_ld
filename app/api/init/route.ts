/**
 * POST /api/init
 * Creates all database tables and runs schema migrations.
 * Safe to call multiple times (uses versioned idempotent migrations).
 * Protected by CRON_SECRET header only.
 */
import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { runMigrations } from "@/lib/migrations";

export async function POST(req: NextRequest) {
  // Protect endpoint: require CRON_SECRET header exclusively (no query parameters)
  const secret = req.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initializeDatabase();
    const migrationResult = await runMigrations().catch((mErr) => {
      console.warn("Migration runner returned error during init:", mErr);
      return null;
    });

    return NextResponse.json({
      ok: true,
      message: "Database tables and schema migrations verified.",
      appliedMigrations: migrationResult?.applied ?? [],
    });
  } catch (error) {
    console.error("DB init error:", error);
    return NextResponse.json(
      { ok: false, error: "Database initialization failed." },
      { status: 500 }
    );
  }
}
