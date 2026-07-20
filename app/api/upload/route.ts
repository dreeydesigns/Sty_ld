/**
 * POST /api/upload
 * Uploads an image to Cloudinary and returns the secure URL.
 * Accepts multipart/form-data with a "file" field and optional "folder" field.
 * Also accepts application/json with a base64 "dataUrl" field.
 */
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

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
    const contentType = req.headers.get("content-type") ?? "";

    let dataUrl: string;
    let folder = "mobile-salon";

    if (contentType.includes("application/json")) {
      // ── Base64 data URL upload (from ImageUploadEditor canvas output) ──
      const body = (await req.json()) as { dataUrl?: string; folder?: string };
      if (!body.dataUrl) {
        return NextResponse.json({ ok: false, error: "Missing dataUrl" }, { status: 400 });
      }
      dataUrl  = body.dataUrl;
      folder   = body.folder ?? folder;
    } else if (contentType.includes("multipart/form-data")) {
      // ── File upload ──
      const form   = await req.formData();
      const file   = form.get("file") as File | null;
      folder       = (form.get("folder") as string | null) ?? folder;

      if (!file) {
        return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
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

    // Validate it's an image data URL or https URL
    if (!dataUrl.startsWith("data:image/") && !dataUrl.startsWith("https://")) {
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
      { ok: false, error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Allow large bodies for base64 image uploads (Next.js App Router config)
export const maxDuration = 30;
