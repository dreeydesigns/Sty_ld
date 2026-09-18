/**
 * GET /api/admin/integrations
 * Administrative inspection endpoint for external services and environment status.
 * Requires administrator role or valid CRON_SECRET authorization header.
 * NEVER outputs raw secret strings or API keys.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveCurrentStyldUser } from "@/lib/auth-resolver";

interface IntegrationReportItem {
  service: string;
  status: "READY" | "CONFIGURED" | "INCOMPLETE" | "DISABLED" | "MISSING";
  details: string;
}

function getIntegrationStatuses(): IntegrationReportItem[] {
  const items: IntegrationReportItem[] = [];

  // 1. Neon Postgres
  const pgUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (!pgUrl) {
    items.push({ service: "Postgres (Neon)", status: "MISSING", details: "POSTGRES_URL missing" });
  } else if (!pgUrl.startsWith("postgres://") && !pgUrl.startsWith("postgresql://")) {
    items.push({ service: "Postgres (Neon)", status: "INCOMPLETE", details: "Invalid connection URI format" });
  } else {
    items.push({ service: "Postgres (Neon)", status: "READY", details: "Connection URI configured" });
  }

  // 2. Clerk Auth
  const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkSk = process.env.CLERK_SECRET_KEY;
  if (!clerkPk || !clerkSk) {
    items.push({ service: "Clerk Auth", status: "MISSING", details: "Publishable key or secret key missing" });
  } else if (!/^pk_(test|live)_[a-zA-Z0-9$]+$/.test(clerkPk) || !/^sk_(test|live)_[a-zA-Z0-9]+$/.test(clerkSk)) {
    items.push({ service: "Clerk Auth", status: "INCOMPLETE", details: "Key prefix format invalid" });
  } else {
    items.push({ service: "Clerk Auth", status: "READY", details: "Publishable and secret keys configured" });
  }

  // 3. Cloudinary
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const cApiKey = process.env.CLOUDINARY_API_KEY;
  const cApiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !cApiKey || !cApiSecret) {
    items.push({ service: "Cloudinary Media", status: "MISSING", details: "Credentials incomplete" });
  } else {
    items.push({ service: "Cloudinary Media", status: "READY", details: "Cloud name and API credentials configured" });
  }

  // 4. Resend Email
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    items.push({ service: "Resend Email", status: "MISSING", details: "RESEND_API_KEY missing" });
  } else if (!resendKey.startsWith("re_")) {
    items.push({ service: "Resend Email", status: "INCOMPLETE", details: "Invalid API key format (expected re_...)" });
  } else {
    items.push({ service: "Resend Email", status: "CONFIGURED", details: "API key configured for transactional delivery" });
  }

  // 5. Africa's Talking SMS
  const atUser = process.env.AFRICASTALKING_USERNAME;
  const atKey = process.env.AFRICASTALKING_API_KEY;
  if (!atUser || !atKey) {
    items.push({ service: "Africa's Talking SMS", status: "MISSING", details: "Username or API key missing" });
  } else {
    items.push({ service: "Africa's Talking SMS", status: "CONFIGURED", details: "Account username and API key present" });
  }

  // 6. Twilio WhatsApp
  const twilioEnabled = process.env.WHATSAPP_AUTH_ENABLED === "true";
  const twilioSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!twilioEnabled || !twilioSid) {
    items.push({ service: "Twilio WhatsApp", status: "DISABLED", details: "Feature flag false or Verify Service SID unset" });
  } else if (!/^VA[0-9a-f]{32}$/i.test(twilioSid)) {
    items.push({ service: "Twilio WhatsApp", status: "INCOMPLETE", details: "Verify Service SID must start with VA" });
  } else {
    items.push({ service: "Twilio WhatsApp", status: "READY", details: "Verified and active" });
  }

  // 7. M-Pesa Daraja
  const mpesaKey = process.env.MPESA_CONSUMER_KEY;
  const mpesaSecret = process.env.MPESA_CONSUMER_SECRET;
  const mpesaPasskey = process.env.MPESA_PASSKEY;
  const mpesaShortcode = process.env.MPESA_SHORTCODE;
  if (!mpesaKey && !mpesaSecret) {
    items.push({ service: "M-Pesa Daraja", status: "MISSING", details: "Daraja credentials missing" });
  } else if (!mpesaPasskey || !mpesaShortcode) {
    items.push({
      service: "M-Pesa Daraja",
      status: "INCOMPLETE",
      details: "Consumer key/secret present; passkey & shortcode required for STK Push",
    });
  } else {
    items.push({ service: "M-Pesa Daraja", status: "CONFIGURED", details: "Sandbox credentials complete" });
  }

  // 8. Stripe Payments
  const stripeSk = process.env.STRIPE_API_SECRET_KEY;
  const stripePk = process.env.STRIPE_API_PUBLISHABLE_KEY;
  const stripeEnabled = process.env.ENABLE_STRIPE_PAYMENTS === "true";
  if (!stripeSk && !stripePk) {
    items.push({ service: "Stripe Payments", status: "MISSING", details: "Keys not set" });
  } else if (!stripeEnabled) {
    items.push({ service: "Stripe Payments", status: "DISABLED", details: "Keys present; feature-gated OFF for Nairobi launch" });
  } else {
    items.push({ service: "Stripe Payments", status: "CONFIGURED", details: "Stripe active" });
  }

  // 9. Firebase FCM
  const fbKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const fbProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!fbKey || !fbProject) {
    items.push({ service: "Firebase (FCM Push)", status: "MISSING", details: "Firebase credentials missing" });
  } else {
    items.push({ service: "Firebase (FCM Push)", status: "CONFIGURED", details: "Client config present; reserved for FCM web push only" });
  }

  // 10. Cron Jobs
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    items.push({ service: "Cron Jobs", status: "DISABLED", details: "CRON_SECRET not configured" });
  } else if (cronSecret.length < 16) {
    items.push({ service: "Cron Jobs", status: "INCOMPLETE", details: "CRON_SECRET should be at least 16 chars" });
  } else {
    items.push({ service: "Cron Jobs", status: "READY", details: "CRON_SECRET configured for authorized maintenance triggers" });
  }

  return items;
}

export async function GET(req: NextRequest) {
  // Authorization: header check or admin session
  const cronHeader = req.headers.get("x-cron-secret");
  const configuredCron = process.env.CRON_SECRET?.trim();
  const isCronAuthorized = configuredCron && cronHeader && cronHeader === configuredCron;

  if (!isCronAuthorized) {
    const authSession = await resolveCurrentStyldUser().catch(() => null);
    if (!authSession || authSession.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }
  }

  const integrations = getIntegrationStatuses();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    integrations,
  });
}
