import { betterAuth, APIError } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import { authPool } from './auth-database';
import { sendEmail } from './email-provider';
import { consumeLimit, securityEvent, recordBrowserSignIn } from './security-events';
import { accountMaySignIn } from './auth-policy';

export const auth = betterAuth({
  appName: 'STYLD',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  hooks: { before: createAuthMiddleware(async (ctx) => {
    if (ctx.path === '/email-otp/send-verification-otp' && typeof ctx.body?.email === 'string') {
      if (!await consumeLimit(`email:cooldown:${ctx.body.email.trim().toLowerCase()}`, 1, 30)) {
        throw new APIError('TOO_MANY_REQUESTS', { message: 'Wait 30 seconds before requesting another code.' });
      }
    }
  }) },
  database: authPool,
  user: {
    modelName: 'users',
    fields: { name: 'first_name', emailVerified: 'email_verified', image: 'profile_image_url', createdAt: 'created_at', updatedAt: 'updated_at' },
  },
  account: { modelName: 'auth_accounts', accountLinking: { enabled: false } },
  verification: { modelName: 'auth_verifications' },
  session: {
    modelName: 'auth_sessions', expiresIn: 30 * 86400, updateAge: 86400, freshAge: 600,
    cookieCache: { enabled: false },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: process.env.VERCEL ? ['x-vercel-forwarded-for'] : ['x-styld-unset-ip'] },
    database: { generateId: 'uuid' },
    cookies: { session_token: { name: 'session', attributes: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' } } },
  },
  rateLimit: { enabled: true, storage: 'database', modelName: 'auth_limits', window: 60, max: 30 },
  socialProviders: process.env.GOOGLE_AUTH_VERIFIED === 'true' && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
    google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET },
  } : {},
  plugins: [{
    id: 'styld-awaited-delivery',
    // Better Auth's default helper logs and swallows mail failures. This MVP
    // must report failed delivery and quota errors instead of claiming a code
    // was sent. All configured notification work is awaited in the request.
    init: () => ({ context: {
      runInBackgroundOrAwait: async (promise: Promise<unknown> | void) => await promise,
    } }),
  }, emailOTP({
    otpLength: 6, expiresIn: 600, allowedAttempts: 5, storeOTP: 'hashed',
    async sendVerificationOTP({ email, otp, type }) {
      if (type !== 'sign-in') throw new APIError('BAD_REQUEST', { message: 'Use email sign-in to access your account.' });
      // Atomic shared counters cap provider costs across all server instances.
      if (!await consumeLimit(`email:${email.toLowerCase()}`, 3, 600) || !await consumeLimit('email:daily', 90, 86400) || !await consumeLimit('email:monthly', 2700, 31 * 86400)) {
        throw new APIError('TOO_MANY_REQUESTS', { message: 'Email limit reached. Please try again later.' });
      }
      const delivery = await sendEmail({ to: email, subject: 'Your STYLD sign-in code',
        text: `${otp} is your STYLD verification code. It expires in 10 minutes. Do not share it. If you did not request this code, ignore this email.` });
      await securityEvent(delivery.ok ? 'otp_sent' : 'otp_delivery_failed', null);
      if (!delivery.ok) throw new APIError('SERVICE_UNAVAILABLE', { message: 'We could not deliver your code. Please try again later.' });
    },
  })],
  databaseHooks: {
    user: { create: { after: async (user) => {
      await authPool.query("INSERT INTO identity_workspaces(user_id,role) VALUES($1,'client') ON CONFLICT(user_id,role) DO NOTHING",[user.id]);
      await authPool.query(`INSERT INTO user_roles (user_id,role) VALUES ($1,'client') ON CONFLICT (user_id,role) DO NOTHING`, [user.id]);
    } } },
    session: { create: {
      before: async (session) => {
        const { rows } = await authPool.query('SELECT deletion_status,deletion_requested_at,auth_suspended,suspended FROM users WHERE id=$1', [session.userId]);
        const u = rows[0];
        if (!u || u.auth_suspended || u.suspended || !accountMaySignIn(u.deletion_status || 'active', u.deletion_requested_at)) throw new APIError('FORBIDDEN', { message: 'This account is unavailable. Please contact support.' });
        return { data: session };
      },
      after: async (session, context) => {
        await securityEvent('login_success', session.userId, context?.headers, { sessionId: session.id });
        await recordBrowserSignIn(session.userId,context?.headers);
      },
    } },
  },
});
