import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import {
  AuthFlowError,
  whatsappConfiguration,
  whatsappRequest,
  isPhoneAllowlisted,
  getDevOtpHint,
} from '@/lib/whatsapp-provider';

export const runtime = 'nodejs';
const cookieName = 'styld_whatsapp_challenge';
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
const publicRoles = ['client', 'professional', 'salon', 'shop', 'delivery'];

export async function GET() {
  try {
    const config = whatsappConfiguration();
    return NextResponse.json(
      {
        ok: true,
        available: true,
        devMode: config.isDev,
        isTestMode: Boolean(config.isTestMode),
        channel: config.isTestMode ? 'test' : 'whatsapp',
        message: config.isTestMode ? 'Test authentication is active' : undefined,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        available: false,
        devMode: false,
        isTestMode: false,
        channel: 'whatsapp',
        error: error instanceof AuthFlowError ? error.message : 'WhatsApp sign-in is not available yet.',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new AuthFlowError('Please use the Styld sign-in page.', 403);
    const body = await request.json();
    const config = (whatsappConfiguration() as any) || {};
    if (body.action === 'start') {
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new AuthFlowError('Enter a valid phone number, including the country code.');

      if (config.isTestMode && typeof isPhoneAllowlisted === 'function' && !isPhoneAllowlisted(phone)) {
        throw new AuthFlowError('Test authentication is not enabled for this phone number.', 403);
      }

      // Use only the platform-overwritten IP header on Vercel; other hosts share a conservative bucket.
      const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
      for (const key of [`phone:${phone}`, `ip:${ip}`]) {
        const limit = key.startsWith('phone:') ? 5 : 20;
        const limited = await sql`
          INSERT INTO auth_rate_limits (key, count, window_start, last_attempt)
          VALUES (${hash(key)}, 1, NOW(), NOW())
          ON CONFLICT (key) DO UPDATE SET
            count = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN 1 ELSE auth_rate_limits.count + 1 END,
            window_start = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN NOW() ELSE auth_rate_limits.window_start END,
            last_attempt = NOW()
          WHERE (auth_rate_limits.window_start < NOW() - INTERVAL '1 hour' OR auth_rate_limits.count < ${limit})
            AND auth_rate_limits.last_attempt < NOW() - INTERVAL '60 seconds'
          RETURNING key
        `;
        if (!limited.rowCount) throw new AuthFlowError('Please wait before requesting another code. Try again in a minute, or later if you have reached the hourly limit.', 429);
      }
      const verification = await whatsappRequest('Verifications', { To: phone, Channel: config.isTestMode ? 'test' : 'whatsapp' });
      const isTestOrDev = Boolean(config.isTestMode || config.isDev);
      const validChannel = isTestOrDev
        ? verification.channel === 'test' || verification.channel === 'whatsapp'
        : verification.channel === 'whatsapp';
      const validSid = isTestOrDev
        ? Boolean(verification.sid)
        : /^VE[0-9a-f]{32}$/i.test(verification.sid);

      if (verification.status !== 'pending' || verification.to !== phone || !validChannel || !validSid) {
        throw new AuthFlowError('We could not start WhatsApp verification.', 503);
      }
      const token = crypto.randomBytes(32).toString('hex');
      await sql`DELETE FROM whatsapp_auth_challenges WHERE expires_at < NOW()`;
      await sql`INSERT INTO whatsapp_auth_challenges (token_hash, phone, verification_sid, expires_at)
        VALUES (${hash(token)}, ${phone}, ${verification.sid}, NOW() + INTERVAL '10 minutes')`;

      const devHint = config.isTestMode && typeof getDevOtpHint === 'function'
        ? getDevOtpHint(verification.sid)
        : config.isDev
          ? 'Test code: 123456'
          : undefined;

      const response = NextResponse.json(
        {
          ok: true,
          step: 'code',
          retryAfter: 60,
          isTestMode: Boolean(config.isTestMode),
          devHint,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
      response.cookies.set(cookieName, token, { ...cookieOptions, maxAge: 600 });
      return response;
    }
    if (!['verify', 'complete'].includes(body.action)) throw new AuthFlowError('Unknown authentication action.');
    const token = request.cookies.get(cookieName)?.value;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AuthFlowError('Request a new WhatsApp code to continue.', 401);
    const tokenHash = hash(token);
    if (body.action === 'verify') {
      if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new AuthFlowError('Enter the six-digit code.');
      // Atomic attempt claim prevents concurrent requests from bypassing the attempt cap.
      const challenge = await sql`UPDATE whatsapp_auth_challenges SET attempts = attempts + 1
        WHERE token_hash = ${tokenHash} AND expires_at > NOW() AND consumed_at IS NULL AND verified_at IS NULL AND attempts < 5
        RETURNING phone, verification_sid`;
      const row = challenge.rows[0];
      if (!row) throw new AuthFlowError('This verification has expired or reached its attempt limit. Request a new code.', 401);
      const checked = await whatsappRequest('VerificationCheck', { To: row.phone, VerificationSid: row.verification_sid, Code: body.code });
      const isTestOrDev = Boolean(config.isTestMode || config.isDev);
      const validVerifyChannel = isTestOrDev
        ? checked.channel === 'test' || checked.channel === 'whatsapp'
        : checked.channel === 'whatsapp';

      if (checked.status !== 'approved' || checked.to !== row.phone || !validVerifyChannel) {
        throw new AuthFlowError('That code did not match. Please check your verification code.');
      }
      if (checked.sid && !/^V[EK][0-9a-f]{32}$/i.test(checked.sid) && checked.sid !== row.verification_sid && !isTestOrDev) {
        throw new AuthFlowError('That code did not match. Please check your verification code.');
      }
      await sql`UPDATE whatsapp_auth_challenges SET verified_at = NOW() WHERE token_hash = ${tokenHash} AND consumed_at IS NULL AND expires_at > NOW()`;
    }
    const client = await sql.connect();
    try {
      await client.query('BEGIN');
      const proof = await client.query('SELECT phone FROM whatsapp_auth_challenges WHERE token_hash = $1 AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at > NOW() FOR UPDATE', [tokenHash]);
      if (!proof.rows[0]) throw new AuthFlowError('Verification expired. Please request a new code.', 401);
      const phone = proof.rows[0].phone;
      // Serialize different verified challenges for the same phone before creating an account.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [phone]);
      let user = (await client.query('SELECT id, role, deletion_status, deletion_requested_at, is_universal_admin FROM users WHERE phone = $1 FOR UPDATE', [phone])).rows[0];
      // Deletion lifecycle mirrors lib/auth-server.ts: active accounts, and
      // pending accounts still inside their 30-day grace, may sign in (so a
      // deletion can be cancelled). Anything else is locked out.
      const deletionStatus = user?.deletion_status as string | null | undefined;
      const deletionRequestedAt = user?.deletion_requested_at ? new Date(user.deletion_requested_at as string).getTime() : 0;
      const inDeletionGrace = deletionStatus === 'pending' && deletionRequestedAt > 0 && Date.now() - deletionRequestedAt < 30 * 24 * 60 * 60 * 1000;
      if (user && deletionStatus && deletionStatus !== 'active' && !inDeletionGrace) throw new AuthFlowError('This account is unavailable. Contact support for help.', 403);
      if (user && (!publicRoles.includes(user.role) || user.is_universal_admin)) throw new AuthFlowError('This account requires the dedicated staff sign-in process.', 403);
      if (!user) {
        if (body.action !== 'complete') {
          await client.query('COMMIT');
          return NextResponse.json({ ok: true, step: 'profile' }, { headers: { 'Cache-Control': 'no-store' } });
        }
        const name = typeof body.firstName === 'string' ? body.firstName.trim() : '';
        const role = body.role || 'client';
        if (!name || name.length > 100 || !publicRoles.includes(role) || body.acceptTerms !== true) throw new AuthFlowError('Add your first name and agree to the terms to continue.');
        user = (await client.query("INSERT INTO users (phone, first_name, role, phone_verified, terms_accepted_at, terms_version) VALUES ($1, $2, $3, true, NOW(), '2026-09-12') RETURNING id, role", [phone, name, role])).rows[0];
      }
      const session = crypto.randomBytes(32).toString('hex');
      await client.query('UPDATE users SET phone_verified = true WHERE id = $1', [user.id]);
      await client.query("INSERT INTO sessions (user_id, token_hash, device_name, browser, assumed_role) VALUES ($1, $2, 'WhatsApp sign-in', $3, $4)", [user.id, hash(session), (request.headers.get('user-agent') || '').slice(0, 200), user.role]);
      await client.query('UPDATE whatsapp_auth_challenges SET consumed_at = NOW() WHERE token_hash = $1', [tokenHash]);
      await client.query('COMMIT');
      const response = NextResponse.json({ ok: true, step: 'done' }, { headers: { 'Cache-Control': 'no-store' } });
      response.cookies.set('session', session, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 });
      response.cookies.set('user_id', user.id, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 });
      response.cookies.set('assumed_role', user.role, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 });
      response.cookies.set(cookieName, '', { ...cookieOptions, maxAge: 0 });
      return response;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof AuthFlowError ? error.message : 'Sign-in could not be completed. Please try again.' }, { status: error instanceof AuthFlowError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
