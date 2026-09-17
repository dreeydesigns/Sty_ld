# STYLD — System Architecture & Trust Boundaries

## 1. High-Level Architecture

```mermaid
flowchart TD
    subgraph ClientTier [Client Tier (Mobile-First Web / Future Native)]
        Browser["Mobile Web Browser / PWA (Next.js Client Components)"]
        FutureIOS["Future iOS App (Swift)"]
        FutureAndroid["Future Android App (Kotlin)"]
    end

    subgraph EdgeTier [Edge & Gateway Tier (Vercel)]
        EdgeMiddleware["Next.js Middleware (Security Headers, Feature Gates, Auth Check)"]
        StaticAssets["Static Edge CDN (Images, CSS, Fonts, PWA Assets)"]
    end

    subgraph AppTier [Application Tier (Next.js App Router)]
        APIRoutes["Server API Handlers (app/api/*)"]
        AuthServer["Auth Engine (lib/auth-server.ts)"]
        BookingEngine["Booking State Engine (lib/booking-state.ts)"]
        SanitizedLogger["Sanitized Logger (lib/logger.ts)"]
        AnalyticsEngine["Analytics Taxonomy (lib/analytics.ts)"]
        Migrations["Migration Runner (lib/migrations.ts)"]
    end

    subgraph TrustBoundaryExternal [External Services & Trust Boundaries]
        TwilioVerify["Twilio Verify API v2 (WhatsApp OTP Channel)"]
        Cloudinary["Cloudinary (Media Transforms & Storage)"]
        FutureMpesa["Safaricom Daraja API (Future M-Pesa Rails)"]
    end

    subgraph DataTier [Persistence Tier]
        Postgres[("Vercel / Neon PostgreSQL")]
    end

    Browser -->|"HTTPS"| EdgeMiddleware
    FutureIOS -.->|"REST JSON"| APIRoutes
    FutureAndroid -.->|"REST JSON"| APIRoutes
    EdgeMiddleware --> StaticAssets
    EdgeMiddleware --> APIRoutes

    APIRoutes --> AuthServer
    APIRoutes --> BookingEngine
    APIRoutes --> SanitizedLogger
    APIRoutes --> AnalyticsEngine

    AuthServer -->|"Server-to-Server HTTPS (SK:secret)"| TwilioVerify
    APIRoutes -->|"Presigned Uploads"| Cloudinary
    BookingEngine -.->|"STK Push"| FutureMpesa

    AuthServer --> Postgres
    BookingEngine --> Postgres
    AnalyticsEngine --> Postgres
    Migrations --> Postgres
```

---

## 2. Trust Boundaries & Security Enclaves

1. **Browser / Client Boundary**:
   - The browser is completely untrusted.
   - All role checks (`assumedRole`, `is_universal_admin`), booking mutations, and financial calculations are enforced authoritatively on the server.
   - Authentication relies exclusively on opaque, random 256-bit HTTP-only session cookies hashed with SHA-256 in the database.
   - Zero client-controlled `user_id` authority.

2. **Twilio / WhatsApp Boundary**:
   - The browser never communicates with Twilio directly.
   - Server-side credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_VERIFY_SERVICE_SID`) are strictly kept out of client bundles, logs, and git.
   - OTP codes are received and verified exclusively through server-side `VerificationCheck` calls.

3. **Database Boundary**:
   - Database operations use parameterized queries via `@vercel/postgres` tagged templates, eliminating SQL injection.
   - Migrations are versioned and recorded in `schema_migrations`.
   - Normal request paths do not execute runtime DDL.

4. **Feature Gate Boundary**:
   - Feature flags (`FEATURES`) govern route access at the edge middleware level.
   - Direct URL navigation to unreleased surfaces (`/shop`, `/delivery`, `/counter`) is intercepted before rendering.
