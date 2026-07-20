/**
 * POST /api/init
 * Creates all database tables if they don't already exist.
 * Safe to call multiple times (uses CREATE TABLE IF NOT EXISTS).
 * Protected by CRON_SECRET — call once after first deploy.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(req: NextRequest) {
  // Protect endpoint: require CRON_SECRET header or query param
  const secret =
    req.headers.get("x-cron-secret") ??
    new URL(req.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Users ──────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone                 VARCHAR(20)  UNIQUE NOT NULL,
        first_name            VARCHAR(100) NOT NULL,
        last_name             VARCHAR(100),
        email                 VARCHAR(255) UNIQUE,
        password_hash         VARCHAR(255),
        phone_verified        BOOLEAN      DEFAULT false,
        email_verified        BOOLEAN      DEFAULT false,
        role                  VARCHAR(20)  DEFAULT 'client',
        profile_image_url     VARCHAR(500),
        cover_image_url       VARCHAR(500),
        bio                   TEXT,
        display_name          VARCHAR(150),
        salon_name            VARCHAR(150),
        location              VARCHAR(200),
        theme                 VARCHAR(50),
        tribe_badge           VARCHAR(10),
        created_at            TIMESTAMP    DEFAULT NOW(),
        updated_at            TIMESTAMP    DEFAULT NOW(),
        deletion_status       VARCHAR(20)  DEFAULT 'active',
        deletion_requested_at TIMESTAMP
      )
    `;

    // ── OTPs (legacy plaintext store) ─────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS otps (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone       VARCHAR(20)  NOT NULL,
        code        VARCHAR(6)   NOT NULL,
        expires_at  TIMESTAMP    NOT NULL,
        verified_at TIMESTAMP,
        created_at  TIMESTAMP    DEFAULT NOW()
      )
    `;

    // ── OTP codes (hashed, upsert-per-phone, with attempt limiting) ──────────
    // DROP first so schema changes (e.g. code → otp_hash) always apply cleanly.
    // OTPs are ephemeral (5-min TTL) so dropping live rows is safe.
    await sql`DROP TABLE IF EXISTS otp_codes`;
    await sql`
      CREATE TABLE otp_codes (
        phone       TEXT PRIMARY KEY,
        otp_hash    TEXT         NOT NULL,
        expires_at  TIMESTAMPTZ  NOT NULL,
        attempts    INTEGER      DEFAULT 0,
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      )
    `;

    // ── Sessions ───────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash     VARCHAR(255) NOT NULL UNIQUE,
        device_name    VARCHAR(100),
        browser        VARCHAR(200),
        ip_address     VARCHAR(50),
        is_current     BOOLEAN      DEFAULT false,
        created_at     TIMESTAMP    DEFAULT NOW(),
        last_active_at TIMESTAMP    DEFAULT NOW()
      )
    `;

    // ── Posts ──────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type                  VARCHAR(20)  NOT NULL DEFAULT 'portfolio',
        caption               TEXT         NOT NULL DEFAULT '',
        tags                  TEXT[]       NOT NULL DEFAULT '{}',
        images                TEXT[]       NOT NULL DEFAULT '{}',
        location              VARCHAR(200),
        likes                 INTEGER      NOT NULL DEFAULT 0,
        share_count           INTEGER      NOT NULL DEFAULT 0,
        saved_by              TEXT[]       NOT NULL DEFAULT '{}',
        bookmarked_by         TEXT[]       NOT NULL DEFAULT '{}',
        reposted_by           TEXT[]       NOT NULL DEFAULT '{}',
        archived              BOOLEAN      NOT NULL DEFAULT false,
        deleted               BOOLEAN      NOT NULL DEFAULT false,
        deleted_at            TIMESTAMP,
        created_at            TIMESTAMP    DEFAULT NOW(),
        updated_at            TIMESTAMP    DEFAULT NOW()
      )
    `;

    // ── Comments ───────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id     UUID         NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        author_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text        TEXT         NOT NULL,
        created_at  TIMESTAMP    DEFAULT NOW()
      )
    `;

    // ── Follows ────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS follows (
        follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at  TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (follower_id, following_id)
      )
    `;

    // ── Stories ────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS stories (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url   TEXT         NOT NULL,
        caption     TEXT,
        expires_at  TIMESTAMP    NOT NULL,
        created_at  TIMESTAMP    DEFAULT NOW()
      )
    `;

    // ── Services ───────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS services (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id      UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name             VARCHAR(100)    NOT NULL,
        description      TEXT,
        price            DECIMAL(10, 2)  NOT NULL,
        duration_minutes INTEGER,
        image_url        VARCHAR(500),
        category         VARCHAR(50),
        is_active        BOOLEAN         DEFAULT true,
        created_at       TIMESTAMP       DEFAULT NOW(),
        updated_at       TIMESTAMP       DEFAULT NOW()
      )
    `;

    // ── Bookings ───────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id    UUID           NOT NULL REFERENCES users(id),
        service_id   UUID           NOT NULL REFERENCES services(id),
        provider_id  UUID           NOT NULL REFERENCES users(id),
        booking_date DATE           NOT NULL,
        booking_time TIME           NOT NULL,
        status       VARCHAR(20)    DEFAULT 'pending',
        notes        TEXT,
        total_price  DECIMAL(10, 2),
        created_at   TIMESTAMP      DEFAULT NOW(),
        updated_at   TIMESTAMP      DEFAULT NOW()
      )
    `;

    // ── Flexible booking columns (idempotent migrations) ─────────────────
    // Make service_id / provider_id nullable so bookings can be created
    // from the static site-data without requiring seeded DB services.
    await sql`ALTER TABLE bookings ALTER COLUMN service_id DROP NOT NULL`.catch(() => null);
    await sql`ALTER TABLE bookings ALTER COLUMN provider_id DROP NOT NULL`.catch(() => null);
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_names  TEXT[]`.catch(() => null);
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_slug  TEXT`.catch(() => null);
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_name  TEXT`.catch(() => null);
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS target_type    TEXT`.catch(() => null);
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_kes      INTEGER`.catch(() => null);
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS local_id       TEXT UNIQUE`.catch(() => null);

    // ── Firebase UID column (idempotent) ──────────────────────────────────
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE
    `;

    // ── Deletion status columns (idempotent) ──────────────────────────────
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(20) DEFAULT 'active'`.catch(() => null);
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP`.catch(() => null);

    // ── Additional user profile columns ──────────────────────────────────
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username      TEXT UNIQUE`.catch(() => null);
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty     TEXT`.catch(() => null);
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS service_mode  TEXT`.catch(() => null);

    // ── Contact messages ──────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       TEXT NOT NULL,
        email      TEXT,
        phone      TEXT,
        subject    TEXT,
        message    TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // ── User settings ─────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        color_scheme         VARCHAR(10)  DEFAULT 'system',
        text_size            VARCHAR(10)  DEFAULT 'medium',
        reduce_motion        BOOLEAN      DEFAULT false,
        high_contrast        BOOLEAN      DEFAULT false,
        push_notifications   BOOLEAN      DEFAULT true,
        private_account      BOOLEAN      DEFAULT false,
        show_activity_status BOOLEAN      DEFAULT true,
        allow_direct_messages BOOLEAN     DEFAULT true,
        updated_at           TIMESTAMP    DEFAULT NOW()
      )
    `;

    return NextResponse.json({
      ok: true,
      message: "All tables created (or already existed). Database is ready.",
      tables: ["users", "otps", "otp_codes", "sessions", "posts", "comments", "follows", "stories", "services", "bookings", "user_settings", "contact_messages"],
    });
  } catch (error) {
    console.error("DB init error:", error);
    return NextResponse.json(
      { ok: false, error: "Database initialization failed", details: String(error) },
      { status: 500 }
    );
  }
}
