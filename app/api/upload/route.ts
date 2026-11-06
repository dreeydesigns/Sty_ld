/**
 * POST /api/upload
 * Uploads an image to Cloudinary and returns the secure URL.
 * Accepts multipart/form-data with a "file" field and optional "folder" field.
 * Also accepts application/json with a base64 "dataUrl" field.
 */
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { resolveCurrentStyldUser } from "@/lib/auth-resolver";
import { authPool } from "@/lib/auth-database";
import { resolvePendingUploadPolicy, resolveMediaDeliveryConfig } from "@/lib/media-delivery-config.cjs";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryResult {
  type?: string;
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

    // A pending image stays unpublished until moderation, so an upload that would land
    // on a public URL is refused before the rate limiter is charged or the provider is
    // called. The policy is read from the server environment, never from the request.
    const uploadPolicy = resolvePendingUploadPolicy(process.env);
    if (!uploadPolicy.allowUploads) {
      return NextResponse.json(
        { ok: false, error: 'Image uploads are not available in this environment yet.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Under the attested restricted basis the asset must belong to a workspace the
    // manifest can name, or no moderation decision about it could ever be proven from
    // server records. Refuse before the limiter is charged rather than accept an
    // untraceable private image.
    const restricted = uploadPolicy.basis === 'restricted-delivery-attested';
    if (restricted && !authSession.workspaceId) {
      return NextResponse.json(
        { ok: false, error: 'Image uploads are not available for this account yet.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      return NextResponse.json({ ok: false, error: 'Image uploads are not configured.' }, { status: 503 });
    }

    // Rate limiting: 20 uploads per 10 minutes per authenticated user
    try {
      const limitKey = `upload:${authSession.userId}`;
      const rateLimitRes = await authPool.query(
        `INSERT INTO auth_rate_limits (key, count, window_start, last_attempt)
        VALUES ($1, 1, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '10 minutes' THEN 1 ELSE auth_rate_limits.count + 1 END,
          window_start = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '10 minutes' THEN NOW() ELSE auth_rate_limits.window_start END,
          last_attempt = NOW()
        WHERE (auth_rate_limits.window_start < NOW() - INTERVAL '10 minutes' OR auth_rate_limits.count < 20)
        RETURNING count`,
        [limitKey]
      );
      if (!rateLimitRes || rateLimitRes.rowCount === 0) {
        return NextResponse.json(
          { ok: false, error: 'Upload rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitErr) {
      const failure = rateLimitErr as { name?: string; code?: string } | null;
      console.warn("Upload rate limit unavailable:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
      return NextResponse.json({ ok: false, error: 'Uploads are temporarily unavailable. Please try again later.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
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

    // Restricted uploads remain authenticated at the provider. The client receives
    // only the same-origin proxy address, never the signed upstream location.
    const privateDownload = restricted && resolveMediaDeliveryConfig(process.env)?.signingMode === 'private-download';
    const normalizedId = privateDownload ? randomUUID() + '_styld_jpeg' : null;
    const expectedPublicId = normalizedId ? folder + '/' + normalizedId : null;
    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUrl,
        {
          folder,
          resource_type: "image",
          ...(restricted ? { type: "authenticated" } : {}),
          ...(normalizedId ? { public_id: normalizedId, format: 'jpg', overwrite: false } : {}),
          transformation: [
            { quality: 'auto', ...(privateDownload ? {} : { fetch_format: 'auto' }) },
          ],
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"));
          else resolve(result as CloudinaryResult);
        }
      );
    });

    if (restricted && (result.type !== 'authenticated' || (privateDownload && (result.format !== 'jpg' || result.public_id !== expectedPublicId)))) {
      // Never register an asset whose provider answer contradicts restricted storage.
      if (expectedPublicId && result.public_id === expectedPublicId) {
        try { await cloudinary.uploader.destroy(expectedPublicId, { type: result.type === 'authenticated' ? 'authenticated' : 'upload' }); } catch { /* best effort */ }
      }
      return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
    if (!restricted) {
      return NextResponse.json({
        ok: true,
        url:      result.secure_url,
        publicId: result.public_id,
        width:    result.width,
        height:   result.height,
        format:   result.format,
        bytes:    result.bytes,
      });
    }

    // The manifest row is what makes the asset a pending record rather than an
    // untracked file. Everything below comes from the session or the provider answer;
    // the client names nothing.
    const assetId = randomUUID();
    try {
      await authPool.query(
        `INSERT INTO media_manifests
           (asset_id, provider_public_id, owner_workspace_id, version, state, delivery_type,
            provider_restriction_verified, provider_restriction_verified_at)
         VALUES ($1, $2, $3, 1, 'pending', 'authenticated', true, now())`,
        [assetId, result.public_id, authSession.workspaceId]
      );
    } catch (manifestErr) {
      // An asset that cannot be recorded is invisible to moderation, so it is removed
      // best-effort before the response refuses. The refusal says nothing about the
      // provider or the database.
      try { await cloudinary.uploader.destroy(result.public_id, { type: 'authenticated' }); } catch { /* best effort */ }
      const failure = manifestErr as { name?: string; code?: string } | null;
      console.error("Upload manifest write failed:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
      return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      url: `/api/media/pending/${assetId}`,
      assetId,
      delivery: "restricted",
      pendingUrl: `/api/media/pending/${assetId}`,
      width:    result.width,
      height:   result.height,
      format:   result.format,
      bytes:    result.bytes,
    });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error("Upload error:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
    return NextResponse.json(
      { ok: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}

// Allow large bodies for base64 image uploads (Next.js App Router config)
export const maxDuration = 30;
