/**
 * Styld Reviews API (temporarily contained)
 *
 * POST /api/reviews - Review submission is currently disabled.
 * GET  /api/reviews - Public review reads are currently disabled.
 *
 * Why this is contained:
 * A review is only genuine when it follows a real, completed service whose
 * completion is proven by a trusted server record. No authoritative
 * service-completion evidence exists yet, and the booking commitment flag is
 * NOT proof that a service happened. While that verification is not
 * implemented, this endpoint must never create a review and must never
 * publicly present an existing record as a verified completed-service review.
 *
 * This is a containment measure only. It does not define the final reviews
 * architecture. No database records are read, written or deleted here.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth-server";

const REVIEWS_UNAVAILABLE_CODE = "reviews_unavailable";

const REVIEWS_UNAVAILABLE_MESSAGE =
  "Review submission is currently unavailable while we connect genuine completed-service verification. No review has been created.";

export async function POST() {
  try {
    // Authentication is preserved. A caller still needs a valid server-side
    // session before it gets any further than this, but no valid session can
    // create a review while containment is active.
    const cookieStore = await cookies();
    const token = (cookieStore.get("__Secure-session") || cookieStore.get("session"))?.value;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Authentication required to leave a review." },
        { status: 401 }
      );
    }

    try {
      await verifySession(token);
    } catch {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

    // Containment: no request body is read, no booking is trusted, no row is
    // written. The request body can never manufacture eligibility.
    return NextResponse.json(
      { ok: false, code: REVIEWS_UNAVAILABLE_CODE, error: REVIEWS_UNAVAILABLE_MESSAGE },
      { status: 503 }
    );
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      {
        ok: false,
        code: REVIEWS_UNAVAILABLE_CODE,
        error: "Review submission is currently unavailable.",
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  // Containment: existing review records cannot yet be distinguished from
  // legacy or unverified records, and their provenance cannot be established,
  // so they are not served publicly and no reviewer identity is exposed.
  return NextResponse.json(
    {
      ok: false,
      code: REVIEWS_UNAVAILABLE_CODE,
      error:
        "Reviews are not available yet. A review will only appear after a genuinely completed service, and that verification is not live yet.",
    },
    { status: 503 }
  );
}
