/**
 * STYLD, shared media preparation + upload pipeline.
 *
 * Every image surface (profile avatar, portfolio, salon gallery, review photo,
 * feedback attachment, service image, team avatar, cover image, social
 * composer) must use this module so that:
 *   - the same validation applies everywhere
 *   - phone photos are orientation-normalised (no rotated / mirrored uploads)
 *   - oversized phone photos are downscaled before upload
 *   - iPhone HEIC/HEIF is converted when the browser can decode it, otherwise
 *     the user gets a clear message instead of a silent failure
 *   - uploads go through the authenticated Styld endpoint (/api/upload →
 *     Cloudinary). The browser never holds provider secrets.
 */

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const HEIC_MIME_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

/** Value for `accept` on file inputs, includes HEIC so iPhone can select it. */
export const IMAGE_ACCEPT_ATTRIBUTE =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

/** Matches the server cap in app/api/upload/route.ts (5 MB). */
export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Raw camera-roll files may be larger; we downscale before upload. */
export const RAW_INPUT_MAX_BYTES = 25 * 1024 * 1024;
export const DEFAULT_MAX_DIMENSION = 2000;
export const DEFAULT_JPEG_QUALITY = 0.85;

export interface PreparedImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  bytes: number;
  converted: boolean;
}

export type ImageKind = "supported" | "heic" | "unknown";

export function detectImageKind(file: File): ImageKind {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (ACCEPTED_IMAGE_TYPES.indexOf(type) !== -1) return "supported";
  if (HEIC_MIME_TYPES.indexOf(type) !== -1 || /\.(heic|heif)$/.test(name)) return "heic";
  if (!type && /\.(jpe?g|png|webp|gif)$/.test(name)) return "supported";
  return "unknown";
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateImageFile(file: File): ValidationResult {
  if (!file || file.size === 0) {
    return { ok: false, error: "That file appears to be empty. Please choose another photo." };
  }
  if (detectImageKind(file) === "unknown") {
    return { ok: false, error: "That file type is not supported. Please choose a JPG, PNG, WEBP or GIF photo." };
  }
  if (file.size > RAW_INPUT_MAX_BYTES) {
    return { ok: false, error: "That photo is too large (over 25 MB). Please choose a smaller photo." };
  }
  return { ok: true };
}

/** True when the browser can open an in-app camera for this user agent. */
export function cameraApiAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function";
}

async function decodeImage(
  file: File
): Promise<{ width: number; height: number; source: CanvasImageSource; close: () => void }> {
  // Preferred: createImageBitmap applies EXIF orientation for us.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
    } catch {
      // Fall through to <img> decoding: this is where HEIC fails on browsers
      // that cannot decode it, and we surface a clear message instead.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode-failed"));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      source: img,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/**
 * Normalises orientation, downscales and re-encodes a photo so it satisfies the
 * server rules without shipping a 12 MB phone photo. Phone photos keep their
 * upright orientation, so portfolios never show rotated or mirrored images.
 */
export async function prepareImage(
  file: File,
  options: { maxDimension?: number; maxBytes?: number } = {}
): Promise<PreparedImage> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;

  let decoded: Awaited<ReturnType<typeof decodeImage>>;
  try {
    decoded = await decodeImage(file);
  } catch {
    throw new Error(
      detectImageKind(file) === "heic"
        ? "This iPhone HEIC photo could not be processed in this browser. Please re-select it as a JPEG, or choose a JPG or PNG photo."
        : "That image could not be read - it may be corrupted. Please choose another photo."
    );
  }

  const { width: srcW, height: srcH, source, close } = decoded;
  if (!srcW || !srcH) {
    close();
    throw new Error("That image could not be read. Please choose another photo.");
  }

  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    close();
    throw new Error("Your browser could not process this image. Please try another photo.");
  }
  // White matte so transparent PNGs do not turn black when re-encoded.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(source, 0, 0, targetW, targetH);
  close();

  let quality = DEFAULT_JPEG_QUALITY;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }
  if (!blob) {
    throw new Error("Your browser could not process this image. Please try another photo.");
  }
  if (blob.size > maxBytes) {
    throw new Error("That photo is still too large after processing. Please choose a smaller photo.");
  }

  const safeName =
    (file.name || "photo").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "photo";
  const prepared = new File([blob], `${safeName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });

  return {
    file: prepared,
    previewUrl: URL.createObjectURL(prepared),
    width: targetW,
    height: targetH,
    bytes: prepared.size,
    converted: detectImageKind(file) !== "supported" || scale < 1 || quality !== DEFAULT_JPEG_QUALITY,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}

/** Turns in-app camera output (a data URL) into a File for the same pipeline. */
export function dataUrlToFile(dataUrl: string, name = "camera-photo.jpg"): File {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(header || "")?.[1] || "image/jpeg";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime, lastModified: Date.now() });
}

export interface UploadResult {
  ok: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

/** Uploads through the authenticated Styld endpoint. Never uploads directly. */
export async function uploadPreparedImage(file: File, folder?: string): Promise<UploadResult> {
  try {
    const form = new FormData();
    form.append("file", file);
    if (folder) form.append("folder", folder);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      url?: string;
      publicId?: string;
      error?: string;
    };

    if (!res.ok || !data?.ok || !data.url) {
      return { ok: false, error: data?.error || "Upload failed. Please try again." };
    }
    return { ok: true, url: data.url, publicId: data.publicId };
  } catch {
    return { ok: false, error: "We could not reach Styld. Check your connection and try again." };
  }
}

// ── Editor reporting and canvas fallbacks ───────────────────────────────────

export type SizeDeltaTone = "smaller" | "larger" | "same";

export interface SizeDelta {
  text: string;
  tone: SizeDeltaTone;
}

/**
 * Compares the prepared file with the original. A phone photo that was already
 * small can grow when it is re-encoded, so the result never claims a saving that
 * did not happen.
 */
export function describeSizeDelta(originalBytes: number, preparedBytes: number): SizeDelta {
  if (
    !Number.isFinite(originalBytes) ||
    !Number.isFinite(preparedBytes) ||
    originalBytes <= 0 ||
    preparedBytes <= 0
  ) {
    return { text: "size unknown", tone: "same" };
  }
  if (originalBytes === preparedBytes) return { text: "same size", tone: "same" };

  const percent = Math.abs(Math.round(((preparedBytes - originalBytes) / originalBytes) * 100));
  if (percent === 0) return { text: "about the same size", tone: "same" };
  return preparedBytes < originalBytes
    ? { text: `${percent}% smaller`, tone: "smaller" }
    : { text: `${percent}% larger`, tone: "larger" };
}

export interface ColorAdjustment {
  brightness: number; // percent, 100 is neutral
  contrast: number;
  saturation: number;
}

/**
 * Applies the editor's brightness, contrast then saturation order to raw RGBA
 * pixels. Canvas `ctx.filter` is missing in older iOS Safari, where drawing the
 * image would silently ignore the filters the user previewed.
 */
export function adjustImagePixels(data: Uint8ClampedArray, adjustment: ColorAdjustment): void {
  const brightness = adjustment.brightness / 100;
  const contrast = adjustment.contrast / 100;
  const saturation = adjustment.saturation / 100;
  if (brightness === 1 && contrast === 1 && saturation === 1) return;

  for (let i = 0; i < data.length; i += 4) {
    const r0 = data[i] * brightness;
    const g0 = data[i + 1] * brightness;
    const b0 = data[i + 2] * brightness;
    const r1 = (r0 - 128) * contrast + 128;
    const g1 = (g0 - 128) * contrast + 128;
    const b1 = (b0 - 128) * contrast + 128;
    const luma = 0.213 * r1 + 0.715 * g1 + 0.072 * b1;
    data[i] = luma + (r1 - luma) * saturation;
    data[i + 1] = luma + (g1 - luma) * saturation;
    data[i + 2] = luma + (b1 - luma) * saturation;
  }
}

