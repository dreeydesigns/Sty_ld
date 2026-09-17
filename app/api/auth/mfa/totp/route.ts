/**
 * POST /api/auth/mfa/totp
 *
 * RFC 6238 TOTP Two-Factor Authentication & Recovery Codes API for STYLD.
 * Dedicated to staff, administrators, and high-security accounts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import {
  generateTotpSecret,
  verifyTotpCode,
  encryptTotpSecret,
  decryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
} from '@/lib/totp';
import { verifySession } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const sessionUser = await verifySession(sessionToken);
    const body = await req.json();
    const action = body.action || 'setup';

    // ─────────────────────────────────────────────────────────────
    // 1. SETUP (Generate new TOTP secret & QR URI)
    // ─────────────────────────────────────────────────────────────
    if (action === 'setup') {
      const { rows } = await sql`
        SELECT email, first_name FROM users WHERE id = ${sessionUser.id} LIMIT 1
      `;
      const accountName = rows[0]?.email || rows[0]?.first_name || 'styld_account';
      const { secret, otpauthUrl } = generateTotpSecret(accountName);
      const encryptedSecret = encryptTotpSecret(secret);

      // Save pending unverified secret
      await sql`
        INSERT INTO mfa_methods (user_id, type, secret_encrypted, verified_at)
        VALUES (${sessionUser.id}, 'totp', ${encryptedSecret}, NULL)
        ON CONFLICT (user_id, type) DO UPDATE SET
          secret_encrypted = ${encryptedSecret},
          verified_at = NULL,
          created_at = NOW()
      `;

      return NextResponse.json({
        success: true,
        secret,
        otpauthUrl,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. VERIFY (Confirm first code, enable MFA, generate recovery codes)
    // ─────────────────────────────────────────────────────────────
    if (action === 'verify') {
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { success: false, error: 'Enter the 6-digit code from your authenticator app.' },
          { status: 400 }
        );
      }

      const { rows } = await sql`
        SELECT secret_encrypted FROM mfa_methods
        WHERE user_id = ${sessionUser.id} AND type = 'totp'
        LIMIT 1
      `;

      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'MFA setup not initialized.' }, { status: 400 });
      }

      const rawSecret = decryptTotpSecret(rows[0].secret_encrypted);
      const isValid = verifyTotpCode(rawSecret, code);

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid authenticator code. Please check your app.' },
          { status: 400 }
        );
      }

      // Mark MFA verified
      await sql`
        UPDATE mfa_methods SET verified_at = NOW()
        WHERE user_id = ${sessionUser.id} AND type = 'totp'
      `;

      await sql`
        UPDATE users SET totp_enabled = true WHERE id = ${sessionUser.id}
      `;

      // Generate 8 single-use recovery codes
      const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
      await sql`DELETE FROM recovery_codes WHERE user_id = ${sessionUser.id}`;

      for (const h of hashedCodes) {
        await sql`
          INSERT INTO recovery_codes (user_id, code_hash)
          VALUES (${sessionUser.id}, ${h})
        `;
      }

      return NextResponse.json({
        success: true,
        message: 'Two-factor authentication is now active.',
        recoveryCodes: plainCodes,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. VALIDATE (Validate code or recovery code)
    // ─────────────────────────────────────────────────────────────
    if (action === 'validate') {
      const candidate = typeof body.code === 'string' ? body.code.trim() : '';

      // Check if 6-digit TOTP
      if (/^\d{6}$/.test(candidate)) {
        const { rows } = await sql`
          SELECT secret_encrypted FROM mfa_methods
          WHERE user_id = ${sessionUser.id} AND type = 'totp' AND verified_at IS NOT NULL
          LIMIT 1
        `;
        if (rows.length > 0) {
          const secret = decryptTotpSecret(rows[0].secret_encrypted);
          if (verifyTotpCode(secret, candidate)) {
            return NextResponse.json({ success: true, method: 'totp' });
          }
        }
      }

      // Check if recovery code
      const codeHash = hashRecoveryCode(candidate);
      const recoveryRes = await sql`
        UPDATE recovery_codes
        SET consumed_at = NOW()
        WHERE user_id = ${sessionUser.id}
          AND code_hash = ${codeHash}
          AND consumed_at IS NULL
        RETURNING id
      `;

      if (recoveryRes.rows.length > 0) {
        return NextResponse.json({ success: true, method: 'recovery_code' });
      }

      return NextResponse.json(
        { success: false, error: 'Invalid authenticator code or recovery code.' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 4. DISABLE (Deactivate TOTP)
    // ─────────────────────────────────────────────────────────────
    if (action === 'disable') {
      await sql`DELETE FROM mfa_methods WHERE user_id = ${sessionUser.id} AND type = 'totp'`;
      await sql`DELETE FROM recovery_codes WHERE user_id = ${sessionUser.id}`;
      await sql`UPDATE users SET totp_enabled = false WHERE id = ${sessionUser.id}`;

      return NextResponse.json({
        success: true,
        message: 'Two-factor authentication has been disabled.',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown MFA action.' }, { status: 400 });
  } catch (error) {
    console.error('TOTP_MFA_ERROR:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'MFA operation failed.' },
      { status: 500 }
    );
  }
}
