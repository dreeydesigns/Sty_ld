/**
 * POST /api/upload
 * Uploads an image to Cloudinary and returns the secure URL.
 * Accepts multipart/form-data with a "file" field and optional "folder" field.
 * Also accepts application/json with a base64 "dataUrl" field.
 *
 * P0A (scope item E): this endpoint was open to the internet — anonymous callers
 * could push arbitrary bytes into Styld's Cloudinary account (cost + abuse + brand
 * risk). It now requires a verified server-side session and enforces:
 *   401 no session · 415 unsupported content type · 400 bad payload
 *   413 oversize (>5 MB) · 415 disallowed image type · 403 folder not allowed
 *   429 rate limited
 */
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { verifySession } from "@/lib/auth-server";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/** Image types Styld actually serves. Anything else is rejected. */
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Upload destinations the app uses. No caller-chosen arbitrary paths. */
const ALLOWED_FOLDERS = new Set([
  "mobile-salon",
  "mobile-salon/user-uploads",
  "styld",
  "styld/user-uploads",
  "avatars",
  "covers",
  "portfolio",
  "posts",
  "services",
  "profiles",
]);

const DEFAULT_FOLDER = "mobile-salon";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOAD_RATE_LIMIT = { limit: 20, windowMs: 60_000 } as const;

function reject(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Authentication ───────────────────────────────────────────────────
    const token = req.cookies.get("session")?.value;
    if (!token) return reject("Not authenticated.", 401);
    try {
      await verifySession(token);
    } catch {
      return reject("Not authenticated.", 401);
    }

    // ── 2. Rate limit ───────────────────────────────────────────────────────
    const limiter = checkRateLimit(clientKeyFromHeaders(req.headers, "upload"), UPLOAD_RATE_LIMIT);
    if (!limiter.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many uploads. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(limiter.retryAfterMs / 1000)) },
        },
      );
    }

    const contentType = req.headers.get("content-type") ?? "";

    let dataUrl: string;
    let folder = DEFAULT_FOLDER;
    let declaredMime: string | null = null;
    let declaredBytes: number | null = null;

    if (contentType.includes("application/json")) {
      // ── Base64 data URL upload (from ImageUploadEditor canvas output) ──
      const body = (await req.json()) as { dataUrl?: string; folder?: string };
      if (!body.dataUrl) return reject("Missing dataUrl", 400);
      dataUrl = body.dataUrl;
      folder = body.folder ?? folder;
    } else if (contentType.includes("multipart/form-data")) {
      // ── File upload ──
      const form = await req.formData();
      const file = form.get("file") as File | null;
      folder = (form.get("folder") as string | null) ?? folder;

      if (!file) return reject("Missing file", 400);

      if (file.size > MAX_UPLOAD_BYTES) {
        return reject(`Image is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`, 413);
      }

      declaredMime = file.type || null;
      declaredBytes = file.size;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    } else {
      return reject("Unsupported content type. Use application/json or multipart/form-data.", 415);
    }

    // ── 3. Folder allowlist ─────────────────────────────────────────────────
    if (!ALLOWED_FOLDERS.has(folder)) {
      return reject("Destination folder is not allowed.", 403);
    }

    // ── 4. Validate it is an image data URL or https URL, and enforce type/size ──
    if (!dataUrl.startsWith("data:image/") && !dataUrl.startsWith("https://")) {
      return reject("Invalid image format", 400);
    }

    if (dataUrl.startsWith("data:image/")) {
      const mime = dataUrl.slice("data:".length, dataUrl.indexOf(";")).toLowerCase();
      const mimeToCheck = declaredMime ?? mime;
      if (!ALLOWED_MIME_TYPES.has(mimeToCheck)) {
        return reject("Unsupported image type. Use JPEG, PNG, WebP or GIF.", 415);
      }

      if (declaredBytes === null) {
        const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
        const approxBytes = Math.floor((base64.length * 3) / 4);
        if (approxBytes > MAX_UPLOAD_BYTES) {
          return reject(`Image is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`, 413);
        }
      }
    }

    // ── 5. Upload to Cloudinary ─────────────────────────────────────────────
    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUrl,
        {
          folder,
          resource_type: "image",
          transformation: [
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"));
          else resolve(result as CloudinaryResult);
        }
      );
    });

    return NextResponse.json({
      ok: true,
      url:      result.secure_url,
      publicId: result.public_id,
      width:    result.width,
      height:   result.height,
      format:   result.format,
      bytes:    result.bytes,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return reject("Upload failed", 500);
  }
}

// Allow large bodies for base64 image uploads (Next.js App Router config)
export const maxDuration = 30;
