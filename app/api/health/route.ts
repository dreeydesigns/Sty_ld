/**
 * GET /api/health
 * Public health check endpoint for uptime monitoring and deployment verification.
 * Returns clean 200 OK without exposing internal environment details or secrets.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "styld-api",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
