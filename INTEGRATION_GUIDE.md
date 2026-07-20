# Salon & Beauty App — Integration Guide

> **Full-stack wiring: Frontend ↔ Backend ↔ Services**

---

## Project Structure

```
salaon_and_Beauty-main/
├── .env.local                          ← ✅ All API keys (DO NOT commit)
├── next.config.ts                      ← Updated: Cloudinary image domain added
│
├── app/
│   ├── api/                            ← All backend API routes (Next.js Route Handlers)
│   │   ├── auth/
│   │   │   ├── client/
│   │   │   │   ├── send-otp/route.ts   ← ✅ FIXED: Now sends real SMS via Africa's Talking
│   │   │   │   ├── verify-otp/route.ts ← ✅ FIXED: Now verifies against Neon Postgres DB
│   │   │   │   └── signup/route.ts     ← ✅ NEW: Creates user + session in DB
│   │   │   ├── send-otp/route.ts       ← General OTP send (admin/other roles)
│   │   │   ├── signin/route.ts         ← Phone + password sign-in
│   │   │   ├── signup/route.ts         ← General sign-up (uses tempToken flow)
│   │   │   ├── signout/route.ts        ← Clears session cookie
│   │   │   ├── sessions/route.ts       ← List / revoke active sessions
│   │   │   └── otp/route.ts            ← OTP utility endpoint
│   │   ├── bookings/route.ts           ← Create booking + send SMS confirmation
│   │   └── services/route.ts           ← CRUD for salon services
│   │
│   ├── auth/                           ← Auth UI pages
│   ├── dashboard/                      ← Role dashboards
│   ├── book/                           ← Booking flow page
│   └── ...                             ← Other app pages
│
├── components/
│   ├── client-signup-flow.tsx          ← Calls /api/auth/client/* endpoints
│   ├── booking-experience.tsx          ← Calls /api/bookings
│   ├── image-upload-editor.tsx         ← Uploads images to Cloudinary
│   └── ...
│
└── lib/
    ├── africas-talking.ts              ← SMS service wrapper (AT credentials)
    ├── cloudinary.ts                   ← Image upload/delete/optimize
    ├── db.ts                           ← Postgres schema + initializeDatabase()
    ├── auth-server.ts                  ← Session create/verify/revoke (server-only)
    ├── auth.ts                         ← hashPassword / comparePassword helpers
    └── client-session.ts               ← Client-side session storage (localStorage)
```

---

## Environment Variables (`.env.local`)

| Variable | Service | Where to Find |
|---|---|---|
| `AT_USERNAME` | Africa's Talking | Dashboard → Settings → API Keys |
| `AT_API_KEY` | Africa's Talking | Dashboard → Settings → API Keys |
| `CLOUDINARY_API_KEY` | Cloudinary | Console → Settings → API Keys |
| `CLOUDINARY_API_SECRET` | Cloudinary | Console → Settings → API Keys |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary | Console → top of dashboard |
| `CLOUDINARY_URL` | Cloudinary | Full URL (auto-derived) |
| `CRON_SECRET` | Vercel | Generate with `openssl rand -hex 32` |
| `POSTGRES_PRISMA_URL` | Neon (pooled) | Vercel → Storage → Postgres → .env.local |
| `POSTGRES_URL_NON_POOLING` | Neon (direct) | Vercel → Storage → Postgres → .env.local |

> **Security**: `.env.local` is in `.gitignore`. Never push it to GitHub.

---

## API Endpoints & Frontend Connections

### 1. Authentication — Client Sign-Up Flow

**Component**: `components/client-signup-flow.tsx`

| Step | Frontend Call | Backend Route | What Happens |
|---|---|---|---|
| Send OTP | `POST /api/auth/client/send-otp` | `app/api/auth/client/send-otp/route.ts` | Generates 6-digit OTP → stores in `otps` table → sends SMS via Africa's Talking |
| Verify OTP | `POST /api/auth/client/verify-otp` | `app/api/auth/client/verify-otp/route.ts` | Checks `otps` table for valid, unexpired code → marks verified |
| Create Profile | `POST /api/auth/client/signup` | `app/api/auth/client/signup/route.ts` | Creates user in `users` table → creates session → sets `session` cookie |

**Request/Response shapes:**

```ts
// POST /api/auth/client/send-otp
// Body: { phone: "+254712345678", resendCount: 1 }
// Response: { ok: true, expiresAt: "2025-...", resendCount: 1 }

// POST /api/auth/client/verify-otp
// Body: { phone: "+254712345678", code: "123456" }
// Response: { ok: true, verified: true }

// POST /api/auth/client/signup
// Body: { firstName, phone, password, theme, tribeBadge, location }
// Response: { ok: true, profile: ClientUserProfile }
// Side effect: Sets HttpOnly "session" cookie (30 days)
```

---

### 2. Authentication — Sign In / Sign Out

**Route**: `app/api/auth/signin/route.ts`

```ts
// POST /api/auth/signin
// Body: { phone: "+254712345678", password: "secret" }
// Response: { success: true, user: { id, firstName, role } }
// Side effect: Sets HttpOnly "session" cookie
```

**Route**: `app/api/auth/signout/route.ts`

```ts
// POST /api/auth/signout
// Clears "session" cookie
```

---

### 3. Bookings

**Component**: `components/booking-experience.tsx`
**Route**: `app/api/bookings/route.ts`

```ts
// POST /api/bookings — create a booking
// Body: { clientId, serviceId, bookingDate, bookingTime, notes? }
// Side effect: Sends SMS booking confirmation via Africa's Talking
// Response: { success: true, booking: { ...booking row } }

// GET /api/bookings?clientId=<uuid>
// Response: { success: true, bookings: [...] }
```

---

### 4. Services

**Route**: `app/api/services/route.ts`

```ts
// GET /api/services
// Response: { success: true, services: [...] }

// POST /api/services (admin only)
// Body: { name, description, price, durationMinutes?, imageUrl?, category? }
// Response: { success: true, service: { ...row } }
```

---

### 5. Image Uploads (Cloudinary)

**Component**: `components/image-upload-editor.tsx`
**Library**: `lib/cloudinary.ts`

Images are uploaded server-side to avoid exposing API secrets. Create an upload API route like this:

```ts
// app/api/upload/route.ts  (create this if needed)
import { uploadImage } from "@/lib/cloudinary";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadImage(buffer, file.name, "salon-beauty");
  return Response.json({ url: (result as any).secure_url });
}
```

---

## Database Schema

Managed by `lib/db.ts` → `initializeDatabase()`. Run once on first deploy.

```sql
-- users
id UUID PK, phone VARCHAR(20) UNIQUE, first_name, last_name,
email UNIQUE, password_hash, phone_verified, email_verified,
role (client|salon|professional|shop|delivery), profile_image_url, bio,
created_at, updated_at, deletion_status, deletion_requested_at

-- otps
id UUID PK, phone, code VARCHAR(6), expires_at TIMESTAMP NOT NULL,
verified_at TIMESTAMP (null = unused), created_at

-- sessions
id UUID PK, user_id → users(id) ON DELETE CASCADE, token_hash UNIQUE,
device_name, browser, ip_address, is_current, created_at, last_active_at

-- services
id UUID PK, name, description, price DECIMAL(10,2), duration_minutes,
image_url, category, is_active BOOLEAN, created_at, updated_at

-- bookings
id UUID PK, client_id → users(id), service_id → services(id),
booking_date DATE, booking_time TIME, status (pending|confirmed|cancelled),
notes, total_price DECIMAL(10,2), created_at, updated_at
```

To initialize tables, call `initializeDatabase()` once — for example from a setup API route or Vercel's `postbuild` hook:

```ts
// app/api/init-db/route.ts  (delete after first use in production!)
import { initializeDatabase } from "@/lib/db";
export async function GET() {
  await initializeDatabase();
  return Response.json({ ok: true });
}
```

---

## Changes Made in This Build

| File | Change |
|---|---|
| `.env.local` | Updated with correct Africa's Talking API key |
| `app/api/auth/client/send-otp/route.ts` | **FIXED** — was a stub; now stores OTP in DB and sends real SMS |
| `app/api/auth/client/verify-otp/route.ts` | **FIXED** — was a stub; now verifies against DB |
| `app/api/auth/client/signup/route.ts` | **NEW** — was missing; creates user + session in DB |
| `next.config.ts` | Added `res.cloudinary.com` to allowed image domains |

---

## Running Locally

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
# → http://localhost:3000

# Build for production
npm run build
npm start
```

---

## Deploying to Vercel

1. Push to GitHub (ensure `.env.local` is in `.gitignore` ✅)
2. In Vercel dashboard → Settings → Environment Variables, add all variables from `.env.local`
3. Connect your Neon Postgres database under Vercel Storage
4. Deploy — tables auto-init on first `/api/init-db` call

---

## Security Checklist

- [x] `.env.local` is gitignored
- [x] Session cookies are `HttpOnly` + `SameSite=Lax`
- [x] OTPs expire after 5 minutes and are single-use
- [x] Passwords hashed with bcrypt (via `lib/auth.ts`)
- [x] Postgres queries use parameterized `sql` template literals (no SQL injection)
- [ ] **Rotate your Africa's Talking API key** — the old key was exposed in a GitHub conversation (see PDF)
- [ ] **Rotate your Neon DB password** — also visible in PDF
- [ ] Move from AT `sandbox` to live mode when ready for production

