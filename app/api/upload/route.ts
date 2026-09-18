/**
 * POST /api/upload
 * Uploads an image to Cloudinary and returns the secure URL.
 * Accepts multipart/form-data with a "file" field and optional "folder" field.
 * Also accepts application/json with a base64 "dataUrl" field.
 */
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { resolveCurrentStyldUser } from "@/lib/auth-resolver";
import { sql } from "@vercel/postgres";

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

export async function POST(req: NextRequest) {
  try {
    const authSession = await resolveCurrentStyldUser();
    if (!authSession) {
      return NextResponse.json({ ok: false, error: 'Please sign in to upload.' }, { status: 401 });
    }

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      return NextResponse.json({ ok: false, error: 'Image uploads are not configured.' }, { status: 503 });
    }

    // Rate limiting: 20 uploads per 10 minutes per authenticated user
    try {
      const limitKey = `upload:${authSession.userId}`;
      const rateLimitRes = await sql`
        INSERT INTO auth_rate_limits (key, count, window_start, last_attempt)
        VALUES (${limitKey}, 1, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '10 minutes' THEN 1 ELSE auth_rate_limits.count + 1 END,
          window_start = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '10 minutes' THEN NOW() ELSE auth_rate_limits.window_start END,
          last_attempt = NOW()
        WHERE (auth_rate_limits.window_start < NOW() - INTERVAL '10 minutes' OR auth_rate_limits.count < 20)
        RETURNING count;
      `;
      if (!rateLimitRes || rateLimitRes.rowCount === 0) {
        return NextResponse.json(
          { ok: false, error: 'Upload rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitErr) {
      console.warn("Upload rate limit check skipped:", rateLimitErr);
    }

    const contentType = req.headers.get("content-type") ?? "";

    let dataUrl: string;
    let folder = `styld/${authSession.userId}`;

    if (contentType.includes("application/json")) {
      // ── Base64 data URL upload (from ImageUploadEditor canvas output) ──
      const body = (await req.json()) as { dataUrl?: string; folder?: string };
      if (!body.dataUrl) {
        return NextResponse.json({ ok: false, error: "Missing dataUrl" }, { status: 400 });
      }
      dataUrl  = body.dataUrl;
      if (body.folder && typeof body.folder === 'string') {
        folder = `styld/${authSession.userId}/${body.folder.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      }
    } else if (contentType.includes("multipart/form-data")) {
      // ── File upload ──
      const form   = await req.formData();
      const file   = form.get("file") as File | null;
      const customFolder = form.get("folder") as string | null;
      if (customFolder && typeof customFolder === 'string') {
        folder = `styld/${authSession.userId}/${customFolder.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      }

      if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        return NextResponse.json({ ok: false, error: "Missing or invalid file. Supported: JPEG, PNG, WEBP, GIF (max 5MB)" }, { status: 400 });
      }

      const bytes  = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      dataUrl      = `data:${file.type};base64,${buffer.toString("base64")}`;
    } else {
      return NextResponse.json(
        { ok: false, error: "Unsupported content type. Use application/json or multipart/form-data." },
        { status: 415 }
      );
    }

    // Validate it's an image data URL
    if (typeof dataUrl !== 'string' || dataUrl.length > 7 * 1024 * 1024 || !/^data:image\/(jpeg|png|webp|gif);base64,/.test(dataUrl)) {
      return NextResponse.json({ ok: false, error: "Invalid image format" }, { status: 400 });
    }

    // Upload to Cloudinary
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
    return NextResponse.json(
      { ok: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}

// Allow large bodies for base64 image uploads (Next.js App Router config)
export const maxDuration = 30;
