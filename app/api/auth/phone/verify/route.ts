/**
 * POST /api/auth/phone/verify
 *
 * Value-Moment Phone Contact Verification for STYLD.
 * Used during First Booking, Provider/Salon Onboarding, and Account Recovery.
 * Verifies phone contact attribute without forcing the user to log in again.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sql } from '@vercel/postgres';
import { parsePhoneNumber } from '@/lib/phone-utils';
import { getOtpProvider } from '@/lib/otp-provider';
import { verifySession } from '@/lib/auth-server';
import { linkIdentity } from '@/lib/identity-manager';

export const runtime = 'nodejs';

const hash = (val: string) => crypto.createHash('sha256').update(val).digest('hex');

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to verify phone number.' },
        { status: 401 }
      );
    }

    const sessionUser = await verifySession(sessionToken);
    const body = await req.json();
    const action = body.action || 'start';

    // ─────────────────────────────────────────────────────────────
    // 1. ACTION: START (Dispatch phone OTP via configured provider)
    // ─────────────────────────────────────────────────────────────
    if (action === 'start') {
      const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const parsed = parsePhoneNumber(rawPhone);

      if (!parsed.isValid) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid phone number (e.g. 0712 345 678).' },
          { status: 400 }
        );
      }

      const phone = parsed.fullE164;
      const channel = (body.channel as 'sms' | 'whatsapp') || 'sms';

      // Rate limit check
      const rateKey = `phone_verify:${phone}`;
      const rateLimitRes = await sql`
        INSERT INTO auth_rate_limits (key, count, window_start, last_attempt)
        VALUES (${hash(rateKey)}, 1, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN 1 ELSE auth_rate_limits.count + 1 END,
          window_start = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN NOW() ELSE auth_rate_limits.window_start END,
          last_attempt = NOW()
        WHERE (auth_rate_limits.window_start < NOW() - INTERVAL '1 hour' OR auth_rate_limits.count < 5)
          AND auth_rate_limits.last_attempt < NOW() - INTERVAL '30 seconds'
        RETURNING key
      `;

      if (rateLimitRes.rowCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Please wait before requesting another code. Limit reached.' },
          { status: 429 }
        );
      }

      // Dispatch OTP via pluggable provider
      const provider = getOtpProvider(channel);
      const result = await provider.sendOtp({
        to: phone,
        channel,
      });

      // Store challenge in whatsapp_auth_challenges table
      const challengeToken = crypto.randomBytes(32).toString('hex');
      await sql`
        INSERT INTO whatsapp_auth_challenges (token_hash, phone, verification_sid, expires_at)
        VALUES (${hash(challengeToken)}, ${phone}, ${result.sid}, NOW() + INTERVAL '10 minutes')
        ON CONFLICT (token_hash) DO NOTHING
      `;

      const response = NextResponse.json({
        success: true,
        step: 'code',
        phone,
        channel: result.channel,
        sid: result.sid,
        message: `Verification code sent via ${result.channel.toUpperCase()}.`,
      });

      response.cookies.set('styld_phone_verify_token', challengeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      });

      return response;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ACTION: VERIFY (Confirm 6-digit Code & Mark Verified)
    // ─────────────────────────────────────────────────────────────
    if (action === 'verify') {
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const parsed = parsePhoneNumber(rawPhone);

      if (!parsed.isValid || !/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { success: false, error: 'Please provide a valid phone number and 6-digit code.' },
          { status: 400 }
        );
      }

      const phone = parsed.fullE164;
      const channel = (body.channel as 'sms' | 'whatsapp') || 'sms';
      const provider = getOtpProvider(channel);

      const checkResult = await provider.verifyOtp({
        to: phone,
        code,
        verificationSid: body.sid,
      });

      if (!checkResult.valid) {
        return NextResponse.json(
          { success: false, error: 'Invalid verification code. Please try again.' },
          { status: 400 }
        );
      }

      // Update user record: set phone and phone_verified = true
      await sql`
        UPDATE users
        SET phone = ${phone}, phone_verified = true, updated_at = NOW()
        WHERE id = ${sessionUser.id}
      `;

      // Link identity
      await linkIdentity(sessionUser.id, 'phone', phone, { phone, verified: true });

      const response = NextResponse.json({
        success: true,
        message: 'Phone number verified successfully.',
        phone,
        phoneVerified: true,
      });

      response.cookies.delete('styld_phone_verify_token');
      return response;
    }

    return NextResponse.json({ success: false, error: 'Unknown verification action.' }, { status: 400 });
  } catch (error) {
    console.error('PHONE_VERIFY_ERROR:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Phone verification failed.' },
      { status: 500 }
    );
  }
}
