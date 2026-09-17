import { NextResponse } from 'next/server';

// SECURITY: This endpoint has been permanently disabled as part of P0 security
// remediation (see SECURITY_REMEDIATION_REPORT.md). It previously created,
// elevated or reseeded an administrator account and returned its credentials
// in the response body. No public route may ever create, elevate or reseed an
// admin account; provisioning happens exclusively through an authorised
// administrative process with credentials supplied via environment variables.
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: 'This setup endpoint has been disabled. Admin accounts are provisioned through an authorised administrative process only.',
      disabled: true,
      reason: 'security_remediation',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: 'This setup endpoint has been disabled.',
      disabled: true,
      reason: 'security_remediation',
    },
    { status: 410 }
  );
}