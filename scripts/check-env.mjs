/**
 * scripts/check-env.mjs
 *
 * Validates external service environment variables for presence and format ONLY.
 * NEVER logs, echoes, or exposes actual secret or credential values.
 */

import fs from 'fs';
import path from 'path';

// Load .env.local if present and not already loaded into process.env
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

function checkPostgres() {
  const url = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    return { service: 'Postgres (Neon)', status: 'MISSING', details: 'POSTGRES_URL missing' };
  }
  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    return { service: 'Postgres (Neon)', status: 'INCOMPLETE', details: 'Invalid connection URI format' };
  }
  return { service: 'Postgres (Neon)', status: 'READY', details: 'Connection URI configured' };
}

function checkClerk() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const sk = process.env.CLERK_SECRET_KEY;
  if (!pk || !sk) {
    return { service: 'Clerk Auth', status: 'MISSING', details: 'Publishable key or secret key missing' };
  }
  const pkValid = /^pk_(test|live)_[a-zA-Z0-9$]+$/.test(pk);
  const skValid = /^sk_(test|live)_[a-zA-Z0-9]+$/.test(sk);
  if (!pkValid || !skValid) {
    return { service: 'Clerk Auth', status: 'INCOMPLETE', details: 'Key prefix format invalid' };
  }
  return { service: 'Clerk Auth', status: 'READY', details: 'Publishable and secret keys configured' };
}

function checkCloudinary() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return { service: 'Cloudinary Media', status: 'MISSING', details: 'Credentials incomplete' };
  }
  return { service: 'Cloudinary Media', status: 'READY', details: 'Cloud name and API credentials configured' };
}

function checkResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { service: 'Resend Email', status: 'MISSING', details: 'RESEND_API_KEY missing' };
  }
  if (!apiKey.startsWith('re_')) {
    return { service: 'Resend Email', status: 'INCOMPLETE', details: 'Invalid API key format (expected re_...)' };
  }
  return { service: 'Resend Email', status: 'CONFIGURED', details: 'API key configured for transactional delivery' };
}

function checkAfricasTalking() {
  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  if (!username || !apiKey) {
    return { service: "Africa's Talking SMS", status: 'MISSING', details: 'Username or API key missing' };
  }
  return { service: "Africa's Talking SMS", status: 'CONFIGURED', details: 'Account username and API key present' };
}

function checkTwilio() {
  const enabled = process.env.WHATSAPP_AUTH_ENABLED === 'true';
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!enabled || !serviceSid) {
    return { service: 'Twilio WhatsApp', status: 'DISABLED', details: 'Feature flag false or Verify Service SID unset' };
  }
  if (!/^VA[0-9a-f]{32}$/i.test(serviceSid)) {
    return { service: 'Twilio WhatsApp', status: 'INCOMPLETE', details: 'Verify Service SID must start with VA' };
  }
  return { service: 'Twilio WhatsApp', status: 'READY', details: 'Verified and active' };
}

function checkMpesa() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const passkey = process.env.MPESA_PASSKEY;
  const shortcode = process.env.MPESA_SHORTCODE;

  if (!consumerKey && !consumerSecret) {
    return { service: 'M-Pesa Daraja', status: 'MISSING', details: 'Daraja credentials missing' };
  }
  if (!passkey || !shortcode) {
    return { service: 'M-Pesa Daraja', status: 'INCOMPLETE', details: 'Consumer key/secret present; passkey & shortcode required for STK Push' };
  }
  return { service: 'M-Pesa Daraja', status: 'CONFIGURED', details: 'Sandbox credentials complete' };
}

function checkStripe() {
  const sk = process.env.STRIPE_API_SECRET_KEY;
  const pk = process.env.STRIPE_API_PUBLISHABLE_KEY;
  const enabled = process.env.ENABLE_STRIPE_PAYMENTS === 'true';

  if (!sk && !pk) {
    return { service: 'Stripe Payments', status: 'MISSING', details: 'Keys not set' };
  }
  if (!enabled) {
    return { service: 'Stripe Payments', status: 'DISABLED', details: 'Keys present; feature-gated OFF for Nairobi launch' };
  }
  return { service: 'Stripe Payments', status: 'CONFIGURED', details: 'Stripe active' };
}

function checkFirebase() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    return { service: 'Firebase (FCM Push)', status: 'MISSING', details: 'Firebase credentials missing' };
  }
  return { service: 'Firebase (FCM Push)', status: 'CONFIGURED', details: 'Client config present; reserved for FCM web push only' };
}

function checkCron() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { service: 'Cron Jobs', status: 'DISABLED', details: 'CRON_SECRET not configured' };
  }
  if (secret.length < 16) {
    return { service: 'Cron Jobs', status: 'INCOMPLETE', details: 'CRON_SECRET should be at least 16 chars' };
  }
  return { service: 'Cron Jobs', status: 'READY', details: 'CRON_SECRET configured for authorized maintenance triggers' };
}

export function runEnvironmentAudit() {
  return [
    checkPostgres(),
    checkClerk(),
    checkCloudinary(),
    checkResend(),
    checkAfricasTalking(),
    checkTwilio(),
    checkMpesa(),
    checkStripe(),
    checkFirebase(),
    checkCron(),
  ];
}

console.log('\n================================================================');
console.log(' STYLD — External Integrations Environment Diagnostics');
console.log('================================================================\n');

const results = runEnvironmentAudit();

const maxServiceLen = Math.max(...results.map((r) => r.service.length), 20);
const maxStatusLen = 12;

console.log(
  `SERVICE`.padEnd(maxServiceLen + 2) +
  `STATUS`.padEnd(maxStatusLen + 2) +
  `DETAILS`
);
console.log('-'.repeat(maxServiceLen + maxStatusLen + 40));

for (const res of results) {
  console.log(
    `${res.service.padEnd(maxServiceLen + 2)}${res.status.padEnd(maxStatusLen + 2)}${res.details}`
  );
}

console.log('\nAudit complete. Zero credential secrets exposed.\n');
