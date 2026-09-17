import { NextResponse } from "next/server";

// SECURITY: This endpoint has been disabled due to authentication vulnerabilities.
// All authentication must go through the WhatsApp Verify flow or Clerk integration.
// This endpoint previously allowed uncontrolled role assignment and has been
// permanently disabled as part of P0 security remediation.
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "This authentication method has been disabled. Please use WhatsApp Verify or Clerk authentication.",
      disabled: true,
      reason: "security_remediation"
    },
    { status: 410 }
  );
}
