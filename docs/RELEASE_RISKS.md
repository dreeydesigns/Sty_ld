# STYLD — Production Release Risk Register

This document identifies, evaluates, and mitigates technical, operational, and security risks prior to public beta deployment in Nairobi.

---

## Risk Matrix Summary

| ID | Risk Description | Severity | Likelihood | Affected Subsystem | Mitigation Strategy | Owner | Launch Blocker? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Exposed Twilio credentials used for unauthorized OTP dispatch | **High** | Medium | Twilio / Auth | Credentials isolated to server-only env vars. Rotating production API keys and Auth Tokens prior to switching `WHATSAPP_AUTH_ENABLED=true`. Sandbox mock code `123456` active until rotation. | Lead DevOps | **Yes** (until rotated) |
| **RSK-02** | Schema drift between local development and hosted PostgreSQL | **Medium** | Low | Database / Migrations | Implemented versioned migration runner (`lib/migrations.ts`) with `schema_migrations` tracking table. All DDL is non-destructive and idempotent. | Backend Eng | No |
| **RSK-03** | Unauthorized state tampering on client bookings (IDOR) | **High** | Low | Bookings API | Enforced strict server-side ownership verification in `PATCH /api/bookings`. Clients can only cancel or reschedule their own bookings. Providers can only accept/decline their own assignments. | Security Eng | No (Resolved) |
| **RSK-04** | Direct URL bypass of unreleased beta surfaces (Shop/Delivery) | **Medium** | Medium | Client / Navigation | Centralized route feature gating in `middleware.ts` intercepts requests to `/shop`, `/delivery`, `/counter` and redirects to `/discover` with notice. | Frontend Eng | No (Resolved) |
| **RSK-05** | Fabricated reviews and fake provider rating inflation | **Medium** | Low | Reviews Subsystem | Enforced strict eligibility: Reviewer must be authenticated, booking must belong to them, status must be `completed`, and unique constraint prevents duplicate reviews per appointment. | Product Eng | No (Resolved) |
| **RSK-06** | Accidental PII or credential leakage in server logs | **High** | Low | Observability / Logging | Built structured logger (`lib/logger.ts`) with deep sanitization redacting passwords, tokens, secrets, and masking phone numbers to `+2547****7931`. | Security Eng | No (Resolved) |
| **RSK-07** | High mobile bounce rates on 3G/4G networks in Nairobi | **Medium** | Medium | Performance / UX | Implemented responsive mobile layouts, system theme synchronization, zero blank tour tooltips, lightweight Lucide icons, and Cloudinary image transformations. | UX / Frontend | No |
