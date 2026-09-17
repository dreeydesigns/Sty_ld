/**
 * POST /api/init
 * Creates all database tables if they don't already exist.
 * Safe to call multiple times (uses CREATE TABLE IF NOT EXISTS).
 * Protected by CRON_SECRET — call once after first deploy.
 */
import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export async function POST(req: NextRequest) {
  // Protect endpoint: require CRON_SECRET header or query param
  const secret =
    req.headers.get("x-cron-secret") ??
    new URL(req.url).searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initializeDatabase();

    return NextResponse.json({
      ok: true,
      message: "All tables created (or already existed). Database is ready.",
      tables: ["users", "otps", "otp_codes", "sessions", "posts", "comments", "follows", "stories", "services", "bookings", "user_settings", "contact_messages"],
    });
  } catch (error) {
    console.error("DB init error:", error);
    return NextResponse.json(
      { ok: false, error: "Database initialization failed", details: String(error) },
      { status: 500 }
    );
  }
}
