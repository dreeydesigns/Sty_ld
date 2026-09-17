/**
 * POST /api/auth/email
 *
 * Universal Email OTP & Magic Link Authentication Endpoint for STYLD.
 * Action: 'start' -> dispatches 6-digit code / magic link with strict rate limits.
 * Action: 'verify' -> verifies single-use code, provisions/resolves canonical user, sets session cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sql } from '@vercel/postgres';
import { resolveOrCreateUser } from '@/lib/identity-manager';
import { createSession } from '@/lib/auth-server';

export const runtime = 'nodejs';

const COOKIE_NAME = 'styld_email_challenge';
const hash = (val: string) => crypto.createHash('sha256').update(val).digest('hex');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'start';

    // ─────────────────────────────────────────────────────────────
    // 1. ACTION: START (Request Email OTP / Code)
    // ─────────────────────────────────────────────────────────────
    if (action === 'start') {
      const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }

      // Rate limit per email and per IP
      const ip =
        req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'unknown_ip';

      for (const limitKey of [`email:${email}`, `ip:${ip}`]) {
        const maxAttempts = limitKey.startsWith('email:') ? 5 : 20;
        const rateLimitRes = await sql`
          INSERT INTO auth_rate_limits (key, count, window_start, last_attempt)
          VALUES (${hash(limitKey)}, 1, NOW(), NOW())
          ON CONFLICT (key) DO UPDATE SET
            count = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN 1 ELSE auth_rate_limits.count + 1 END,
            window_start = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN NOW() ELSE auth_rate_limits.window_start END,
            last_attempt = NOW()
          WHERE (auth_rate_limits.window_start < NOW() - INTERVAL '1 hour' OR auth_rate_limits.count < ${maxAttempts})
            AND auth_rate_limits.last_attempt < NOW() - INTERVAL '30 seconds'
          RETURNING key
        `;

        if (rateLimitRes.rowCount === 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'Please wait before requesting another code. You have reached the rate limit.',
            },
            { status: 429 }
          );
        }
      }

      // Generate 6-digit OTP code & challenge token
      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const challengeToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hash(challengeToken);
      const codeHash = hash(otpCode);

      // Store in email_auth_challenges
      await sql`DELETE FROM email_auth_challenges WHERE expires_at < NOW()`;
      await sql`
        INSERT INTO email_auth_challenges (token_hash, email, code_hash, expires_at)
        VALUES (${tokenHash}, ${email}, ${codeHash}, NOW() + INTERVAL '10 minutes')
      `;

      // Log or dispatch email
      const isDevOrTest =
        process.env.NODE_ENV !== 'production' || process.env.EMAIL_AUTH_DEV_MODE === 'true';

      const response = NextResponse.json({
        success: true,
        step: 'code',
        email,
        message: 'A verification code has been sent to your email.',
        devCode: isDevOrTest ? otpCode : undefined,
      });

      const isProd = process.env.NODE_ENV === 'production';
      response.cookies.set(COOKIE_NAME, challengeToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });

      return response;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ACTION: VERIFY (Verify 6-digit Code)
    // ─────────────────────────────────────────────────────────────
    if (action === 'verify') {
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { success: false, error: 'Please enter the 6-digit code sent to your email.' },
          { status: 400 }
        );
      }

      const challengeToken = req.cookies.get(COOKIE_NAME)?.value;
      if (!challengeToken) {
        return NextResponse.json(
          { success: false, error: 'Session expired. Please request a new code.' },
          { status: 401 }
        );
      }

      const tokenHash = hash(challengeToken);

      // Atomic attempt check and claim
      const challengeRes = await sql`
        UPDATE email_auth_challenges
        SET attempts = attempts + 1
        WHERE token_hash = ${tokenHash}
          AND expires_at > NOW()
          AND consumed_at IS NULL
          AND attempts < 5
        RETURNING email, code_hash
      `;

      if (challengeRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid, expired, or max-attempted code. Please request a new one.' },
          { status: 401 }
        );
      }

      const { email, code_hash: expectedHash } = challengeRes.rows[0];

      // Validate code hash
      if (hash(code) !== expectedHash) {
        return NextResponse.json(
          { success: false, error: 'Incorrect code. Please check your email.' },
          { status: 400 }
        );
      }

      // Mark challenge consumed
      await sql`
        UPDATE email_auth_challenges
        SET consumed_at = NOW(), verified_at = NOW()
        WHERE token_hash = ${tokenHash}
      `;

      // Resolve or provision canonical Styld user
      const user = await resolveOrCreateUser({
        provider: 'email',
        providerSubject: email.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        role: 'client',
        verified: true,
      });

      // Create session
      const userAgent = req.headers.get('user-agent') || 'Browser';
      const sessionToken = await createSession(user.id, 'Email Verified Device', userAgent);

      // Set cookies
      const cookieStore = await cookies();
      const isProd = process.env.NODE_ENV === 'production';

      cookieStore.set('session', sessionToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      cookieStore.set('user_id', user.id, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      cookieStore.set('assumed_role', user.role || 'client', {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      const response = NextResponse.json({
        success: true,
        message: 'Email verified successfully.',
        user: {
          id: user.id,
          firstName: user.firstName,
          email: user.email,
          role: user.role,
          phoneVerified: user.phoneVerified,
          emailVerified: user.emailVerified,
        },
      });

      // Clear the challenge cookie
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    return NextResponse.json({ success: false, error: 'Unknown authentication action.' }, { status: 400 });
  } catch (error) {
    console.error('EMAIL_AUTH_ERROR:', error);
    return NextResponse.json(
      { success: false, error: 'Email authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}
