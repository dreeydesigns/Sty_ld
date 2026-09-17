/**
 * Styld Central Analytics Taxonomy & Data Foundation
 *
 * Enforces standardized marketplace events for business intelligence,
 * data science, and supply-demand liquidity modeling.
 *
 * Rules:
 * - Strictly strips PII, OTPs, auth tokens, full phone numbers, and private passwords.
 * - Distinguishes between client-reported and server-confirmed events.
 */

import { sql } from '@vercel/postgres';
import { logger } from './logger';

export type AuthEvent =
  | 'auth_started'
  | 'otp_requested'
  | 'otp_sent'
  | 'otp_failed'
  | 'otp_verified'
  | 'signup_completed'
  | 'login_completed'
  | 'logout';

export type DiscoveryEvent =
  | 'search_started'
  | 'search_completed'
  | 'filter_applied'
  | 'provider_viewed'
  | 'service_viewed'
  | 'portfolio_viewed'
  | 'provider_saved';

export type BookingEvent =
  | 'booking_started'
  | 'booking_step_completed'
  | 'booking_abandoned'
  | 'booking_requested_client'
  | 'booking_created_server'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_completed';

export type TrustEvent =
  | 'verification_started'
  | 'verification_submitted'
  | 'verification_approved'
  | 'report_created'
  | 'user_blocked'
  | 'review_submitted';

export type OnboardingEvent =
  | 'tour_started'
  | 'tour_step_viewed'
  | 'tour_skipped'
  | 'tour_completed'
  | 'tour_replayed';

export type AnalyticsEventName =
  | AuthEvent
  | DiscoveryEvent
  | BookingEvent
  | TrustEvent
  | OnboardingEvent;

export interface EventProperties {
  category?: string;
  zone?: string; // e.g. 'kilimani', 'westlands', 'karen'
  providerId?: string;
  providerSlug?: string;
  serviceName?: string;
  bookingId?: string;
  stepIndex?: number;
  totalKES?: number;
  reason?: string;
  [key: string]: unknown;
}

export interface AnalyticsPayload {
  eventName: AnalyticsEventName;
  userId?: string | null;
  anonymousId?: string | null;
  role?: string | null;
  market?: string;
  properties?: EventProperties;
  clientTimestamp?: string;
}

const FORBIDDEN_PROPERTY_KEYS = new Set([
  'otp',
  'code',
  'password',
  'token',
  'phone',
  'national_id',
  'address',
  'street',
]);

/**
 * Sanitize properties to prevent any PII or credential leakage.
 */
export function sanitizeEventProperties(properties?: EventProperties): Record<string, unknown> {
  if (!properties) return {};
  const cleaned: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(properties)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_PROPERTY_KEYS.has(lower) || lower.includes('secret') || lower.includes('password') || lower.includes('token')) {
      continue;
    }
    if (typeof val === 'string' && val.length > 500) {
      cleaned[key] = val.slice(0, 500);
    } else {
      cleaned[key] = val;
    }
  }

  return cleaned;
}

/**
 * Record a server-confirmed analytics event into PostgreSQL.
 */
export async function recordServerEvent(
  eventName: AnalyticsEventName,
  data: {
    userId?: string | null;
    anonymousId?: string | null;
    role?: string | null;
    market?: string;
    properties?: EventProperties;
  }
): Promise<void> {
  try {
    const cleanProps = sanitizeEventProperties(data.properties);
    const market = data.market || 'nairobi';

    await sql`
      INSERT INTO analytics_events (
        event_name, user_id, anonymous_id, role, market, properties
      )
      VALUES (
        ${eventName},
        ${data.userId ?? null},
        ${data.anonymousId ?? null},
        ${data.role ?? null},
        ${market},
        ${JSON.stringify(cleanProps)}::jsonb
      )
    `;
  } catch (err) {
    // Non-blocking: analytics failures must never crash transactional business logic
    logger.warn(`Failed to record analytics event: ${eventName}`, { error: String(err) });
  }
}
