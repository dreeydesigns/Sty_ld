"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Crop, RotateCw, Sliders, Upload, X, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adjustImagePixels,
  dataUrlToFile,
  describeSizeDelta,
  isStorableImageUrl,
  prepareImage,
  uploadPreparedImage,
  validateImageFile,
  type SizeDeltaTone,
} from "@/lib/image-prep";
import { CameraCapture } from "@/components/camera-capture";

// ── Types ─────────────────────────────────────────────────────────────────────

type EditorTab = "filters" | "crop";
type FilterPreset = "natural" | "warm" | "cool" | "vivid" | "fade" | "bw";

interface FilterState {
  brightness: number; // 0 to 200 (100 = neutral)
  contrast: number;   // 0 to 200
  saturation: number; // 0 to 200
  preset: FilterPreset;
}

interface CropState {
  top: number;    // percent 0 to 50
  right: number;
  bottom: number;
  left: number;
}

export interface ImageUploadEditorProps {
  /** Label shown above the upload zone */
  label?: string;
  /** Short description of dimension/format requirements */
  requirements?: string;
  /** Aspect ratio hint, e.g. "16/9", "1/1", "4/3" */
  aspectHint?: string;
  /** Maximum file size in MB */
  maxMB?: number;
  /** Called with the final data-URL when user saves */
  onSave: (dataUrl: string) => void;
  /** Currently saved image URL (to show as preview) */
  value?: string;
  className?: string;
}

// Helper to format bytes to KB/MB
function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// ── Filter preset definitions ─────────────────────────────────────────────────

const PRESETS: { key: FilterPreset; label: string; brightness: number; contrast: number; saturation: number }[] = [
  { key: "natural", label: "Natural", brightness: 100, contrast: 100, saturation: 100 },
  { key: "warm",    label: "Warm",    brightness: 105, contrast: 102, saturation: 115 },
  { key: "cool",    label: "Cool",    brightness: 100, contrast: 105, saturation: 90 },
  { key: "vivid",   label: "Vivid",   brightness: 105, contrast: 115, saturation: 140 },
  { key: "fade",    label: "Fade",    brightness: 115, contrast: 85,  saturation: 70 },
  { key: "bw",      label: "B&W",     brightness: 100, contrast: 110, saturation: 0 },
];

function filterCss(f: FilterState): string {
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%)`;
}

const SIZE_TONE_CLASS: Record<SizeDeltaTone, string> = {
  smaller: "bg-emerald-50 text-emerald-700 border-emerald-100",
  larger: "bg-amber-50 text-amber-800 border-amber-200",
  same: "bg-[var(--surface-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]",
};

// ── Discard confirm dialog ────────────────────────────────────────────────────

function DiscardDialog({
  onDiscard,
  onReturn,
}: {
  onDiscard: () => void;
  onReturn: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[28px] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Discard changes?</h3>
        <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
          Your edits (filters and crop) have not been saved. If you exit now they will be lost.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Discard changes &amp; exit
          </button>
          <button
            type="button"
            onClick={onReturn}
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
          >
            Return to edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ImageUploadEditor({
  label = "Upload image",
  requirements = "JPG, PNG or WEBP \u00B7 Max 5 MB",
  aspectHint,
  maxMB = 5,
  onSave,
  value,
  className,
}: ImageUploadEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preparedUrlRef = useRef<string | null>(null);
  const preparedFileRef = useRef<File | null>(null);
  const [mode, setMode] = useState<"idle" | "editing">("idle");
  const [showCamera, setShowCamera] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("filters");
  const [rawUrl, setRawUrl] = useState<string | null>(null);       // prepared image, editor source
  const [savedUrl, setSavedUrl] = useState<string | null>(isStorableImageUrl(value) ? value : null); // saved result
  const [showDiscard, setShowDiscard] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Compression specific states
  const [isConfirming, setIsConfirming] = useState(false);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [compressing, setCompressing] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    preset: "natural",
  });

  // Crop state (percentage inset from each edge)
  const [crop, setCrop] = useState<CropState>({ top: 0, right: 0, bottom: 0, left: 0 });

  // Track if user has made changes from defaults
  const hasEdits =
    filters.brightness !== 100 ||
    filters.contrast !== 100 ||
    filters.saturation !== 100 ||
    crop.top !== 0 ||
    crop.right !== 0 ||
    crop.bottom !== 0 ||
    crop.left !== 0;

  // Sync value prop with savedUrl state
  useEffect(() => {
    // Only a URL the visitor can still open in a week counts as saved. A legacy record holding a
    // blob: or data: preview has no picture behind it, so the editor shows the empty dropzone
    // rather than a claim the server cannot support.
    if (isStorableImageUrl(value)) {
      setTimeout(() => {
        setSavedUrl(value);
      }, 0);
    }
  }, [value]);

  // ── File handling (delegates to the shared Styld media pipeline) ──────────

  async function readFile(file: File, source: "library" | "camera" = "library") {
    setError(null);
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setCompressing(true);
    try {
      const image = await prepareImage(file);
      if (preparedUrlRef.current) URL.revokeObjectURL(preparedUrlRef.current);
      preparedUrlRef.current = image.previewUrl;
      preparedFileRef.current = image.file;
      setCompressedUrl(image.previewUrl);
      setOriginalSize(file.size);
      setCompressedSize(image.bytes);
      setImageSize({ w: image.width, h: image.height });
      setFilters({ brightness: 100, contrast: 100, saturation: 100, preset: "natural" });
      setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
      setActiveTab("filters");
      setIsConfirming(true);
    } catch (err) {
      console.error("Image preparation error:", err);
      setError(err instanceof Error ? err.message : "Failed to process image. Please try again.");
    } finally {
      setCompressing(false);
    }
    void source;
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }

  function releasePreparedUrl() {
    if (preparedUrlRef.current) {
      URL.revokeObjectURL(preparedUrlRef.current);
      preparedUrlRef.current = null;
    }
  }

  useEffect(
    () => () => {
      if (preparedUrlRef.current) URL.revokeObjectURL(preparedUrlRef.current);
    },
    []
  );

  function cancelSelection() {
    setIsConfirming(false);
    setCompressedUrl(null);
    setRawUrl(null);
    setImageSize(null);
    setError(null);
    preparedFileRef.current = null;
    releasePreparedUrl();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function openAdvancedEditor() {
    if (!compressedUrl) return;
    setRawUrl(compressedUrl);
    setActiveTab("filters");
    setError(null);
    setMode("editing");
  }

  // ── Apply preset ─────────────────────────────────────────────────────────

  function applyPreset(key: FilterPreset) {
    const preset = PRESETS.find((p) => p.key === key)!;
    setFilters({ brightness: preset.brightness, contrast: preset.contrast, saturation: preset.saturation, preset: key });
  }

  // ── Direct finalize save from preview ───────────────────────────────────────

  async function handleFinalizeDirectUpload() {
    const file = preparedFileRef.current;
    if (!file || !compressedUrl || uploading) return;
    setUploading(true);
    setError(null);
    try {
      // Upload the prepared JPEG through the shared Styld pipeline. A local
      // data URL is no longer accepted as a "saved" result on its own.
      const result = await uploadPreparedImage(file, "mobile-salon/user-uploads");
      if (result.ok && result.url) {
        setSavedUrl(result.url);
        onSave(result.url);
        setIsConfirming(false);
        setCompressedUrl(null);
        setRawUrl(null);
        preparedFileRef.current = null;
        releasePreparedUrl();
      } else {
        setError(result.error || "Upload failed. Please try again.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Upload failed. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── Save: render canvas → upload to Cloudinary → call onSave with URL ───────

  function handleSave() {
    if (!rawUrl || uploading) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => {
      setError("We could not reopen that image. Please choose it again.");
    };
    img.onload = async () => {
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const cx = (crop.left / 100) * srcW;
      const cy = (crop.top / 100) * srcH;
      const cw = Math.round(srcW - ((crop.left + crop.right) / 100) * srcW);
      const ch = Math.round(srcH - ((crop.top + crop.bottom) / 100) * srcH);
      if (!(cw > 0) || !(ch > 0)) {
        setError("That crop leaves no image. Reduce the trim and try again.");
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Your browser could not process this image. Please try another photo.");
        return;
      }

      // Older iOS Safari ignores canvas filters, which would save a different
      // picture from the one previewed, so the pixels are adjusted instead.
      const supportsCanvasFilter =
        typeof CanvasRenderingContext2D !== "undefined" &&
        "filter" in CanvasRenderingContext2D.prototype;
      ctx.filter = supportsCanvasFilter ? filterCss(filters) : "none";
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
      if (!supportsCanvasFilter) {
        try {
          const pixels = ctx.getImageData(0, 0, cw, ch);
          adjustImagePixels(pixels.data, filters);
          ctx.putImageData(pixels, 0, 0);
        } catch {
          setError("Your browser blocked the image edit. Please try another photo.");
          return;
        }
      }

      setUploading(true);
      setError(null);
      try {
        const file = dataUrlToFile(canvas.toDataURL("image/jpeg", 0.82), "edited-photo.jpg");
        const result = await uploadPreparedImage(file, "mobile-salon/user-uploads");
        if (!result.ok || !result.url) {
          setError(result.error || "Upload failed. Please try again.");
          return;
        }
        setSavedUrl(result.url);
        onSave(result.url);
        setIsConfirming(false);
        setRawUrl(null);
        setCompressedUrl(null);
        preparedFileRef.current = null;
        releasePreparedUrl();
        setMode("idle");
      } catch (err) {
        console.error("Upload error:", err);
        setError("Upload failed. Please check your connection and try again.");
      } finally {
        setUploading(false);
      }
    };
    img.src = rawUrl;
  }

  // ── Discard ───────────────────────────────────────────────────────────────

  function tryClose() {
    if (hasEdits) {
      setShowDiscard(true);
    } else {
      setMode("idle");
    }
  }

  function confirmDiscard() {
    setShowDiscard(false);
    setMode("idle");
    setRawUrl(null);
    setCompressedUrl(null);
    setIsConfirming(false);
    setFilters({ brightness: 100, contrast: 100, saturation: 100, preset: "natural" });
    setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
    preparedFileRef.current = null;
    releasePreparedUrl();
  }

  // ── Idle state: upload zone ───────────────────────────────────────────────

  if (showCamera) {
    return (
      <div className={className}>
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={async (mediaUrl: string, type: "image" | "video") => {
            setShowCamera(false);
            if (type === "image") {
              try {
                // Route the capture through prepareImage so the size and
                // orientation handling match a photo picked from the library.
                const res = await fetch(mediaUrl);
                const blob = await res.blob();
                const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
                readFile(file);
              } catch (err) {
                console.error("Camera capture process error:", err);
              }
            } else {
              // Ignore video for image upload editor
            }
          }}
          allowVideo={false}
        />
      </div>
    );
  }

  if (mode === "idle") {
    const sizeDelta = describeSizeDelta(originalSize, compressedSize);
    return (
      <div className={className}>
        {label && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-clay-text)]">{label}</p>
        )}
        {requirements && (
          <p className="mb-2 text-[0.6875rem] text-[var(--text-secondary)]">{requirements}{aspectHint ? ` · Best ratio: ${aspectHint}` : ""}</p>
        )}
        <button
          type="button"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!isConfirming) {
              inputRef.current?.click();
            }
          }}
          className={cn(
            "relative flex w-full flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed p-6 text-center transition outline-none",
            isDragging
              ? "border-[var(--color-clay)] bg-[var(--surface-elevated)]"
              : "border-[var(--border-default)] bg-[var(--surface-elevated)] hover:border-[var(--color-clay)] hover:bg-[var(--surface-card)]",
            isConfirming && "cursor-default border-solid border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-card)] hover:border-[var(--border-subtle)]"
          )}
          style={{ minHeight: "160px" }}
        >
          {compressing ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <svg className="animate-spin h-8 w-8 text-[var(--text-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Compressing image client-side...</p>
            </div>
          ) : isConfirming && compressedUrl ? (
            <div className="w-full flex flex-col items-center gap-4 py-2" onClick={(e) => e.stopPropagation()}>
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={compressedUrl}
                  alt="Compressed Thumbnail Preview"
                  className="max-h-40 max-w-full rounded-[16px] object-contain shadow-md border border-[var(--border-subtle)] transition-transform hover:scale-[1.02]"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelSelection();
                  }}
                  className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-card)] text-[var(--text-muted)] shadow-md border border-[var(--border-subtle)] hover:text-red-500 transition-colors"
                  title="Remove selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-center space-y-1.5 max-w-xs">
                <p className="text-sm font-bold text-[var(--text-primary)]">Confirm Image Selection</p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-full px-3 py-1 shadow-sm">
                  <span className="text-[var(--text-primary)] font-semibold">Size:</span>
                  <span className="line-through text-[var(--text-muted)]">{formatBytes(originalSize)}</span>
                  <span className="text-[var(--text-primary)] font-bold">→ {formatBytes(compressedSize)}</span>
                  <span className={cn("text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full border", SIZE_TONE_CLASS[sizeDelta.tone])}>
                    {sizeDelta.text}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm mt-1">
                <button
                  type="button"
                  onClick={handleFinalizeDirectUpload}
                  disabled={uploading}
                  className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--color-action-primary)] text-sm font-semibold text-[var(--color-action-primary-text)] shadow-sm hover:opacity-90 disabled:opacity-60 transition"
                >
                  {uploading ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-4 w-4 text-[var(--color-action-primary-text)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Confirm &amp; Save
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAdvancedEditor();
                  }}
                  className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)] transition"
                >
                  <Sliders className="h-4 w-4" /> Edit &amp; Crop
                </button>
              </div>
            </div>
          ) : savedUrl ? (
            <>
              {/* Show saved thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={savedUrl}
                alt="Uploaded"
                className="max-h-32 max-w-full rounded-[12px] object-contain shadow"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]">
                <Check className="h-4 w-4 text-emerald-500" />
                Image saved, click to replace
              </div>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-clay)]/15">
                <Upload className="h-6 w-6 text-[var(--color-clay-text)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {isDragging ? "Drop it here" : "Tap to upload or drag & drop"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{requirements}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCamera(true);
                }}
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--color-clay)] hover:bg-[var(--surface-elevated)]"
              >
                <Camera className="h-4 w-4 text-[var(--color-clay-text)]" /> Take a photo
              </button>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFileInput}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleFileInput}
          />
        </button>
        {error && (
          <p className="mt-1.5 text-xs text-red-500">{error}</p>
        )}
        {/* Hidden canvas for export */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // ── Editing state ────────────────────────────────────────────────────────

  const previewFilter = filterCss(filters);
  const previewClip = `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`;

  return (
    <>
      {showDiscard && (
        <DiscardDialog
          onDiscard={confirmDiscard}
          onReturn={() => setShowDiscard(false)}
        />
      )}

      {/* Full-screen editor overlay */}
      <div
        className="fixed inset-0 z-[9000] flex flex-col bg-[var(--color-ink)]"
        onClick={(e) => { if (e.target === e.currentTarget) tryClose(); }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={tryClose}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </button>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
            Image editor
            {imageSize && (
              <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.625rem] normal-case text-white/40">
                {imageSize.w}×{imageSize.h}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={tryClose}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Return to edit
          </button>
        </div>

        {/* Image preview */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-6">
          {rawUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rawUrl}
              alt="Preview"
              className="max-h-full max-w-full rounded-[12px] object-contain shadow-[0_16px_60px_rgba(0,0,0,0.5)]"
              style={{
                filter: previewFilter,
                clipPath: previewClip,
                transition: "filter 0.2s, clip-path 0.2s",
              }}
            />
          )}
        </div>

        {/* Bottom controls panel */}
        <div className="border-t border-white/10 bg-[#0d1b2a]">
          {/* Tab bar */}
          <div className="flex border-b border-white/10">
            {[
              { key: "filters" as EditorTab, icon: <Sliders className="h-4 w-4" />, label: "Filters" },
              { key: "crop" as EditorTab, icon: <Crop className="h-4 w-4" />, label: "Crop" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-3 text-xs font-semibold transition",
                  activeTab === t.key
                    ? "border-b-2 border-[var(--color-secondary)] text-white"
                    : "text-white/40 hover:text-white/70",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto px-4 py-4">
            {activeTab === "filters" && (
              <div className="space-y-5">
                {/* Preset chips */}
                <div>
                  <p className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-white/40">Presets</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => applyPreset(p.key)}
                        className={cn(
                          "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                          filters.preset === p.key
                            ? "bg-[var(--color-accent)] text-white"
                            : "bg-white/10 text-white/60 hover:bg-white/20",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                {[
                  { label: "Brightness", key: "brightness" as const, min: 50, max: 150 },
                  { label: "Contrast",   key: "contrast"   as const, min: 50, max: 150 },
                  { label: "Saturation", key: "saturation" as const, min: 0,  max: 200 },
                ].map((slider) => (
                  <div key={slider.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-white/60">{slider.label}</p>
                      <p className="text-xs font-mono text-white/40">{filters[slider.key]}</p>
                    </div>
                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      value={filters[slider.key]}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, [slider.key]: Number(e.target.value), preset: "natural" }))
                      }
                      className="w-full accent-[var(--color-secondary)]"
                    />
                  </div>
                ))}

                {/* Reset */}
                {hasEdits && (
                  <button
                    type="button"
                    onClick={() => {
                      applyPreset("natural");
                      setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
                    }}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70"
                  >
                    <RotateCw className="h-3 w-3" />
                    Reset all edits
                  </button>
                )}
              </div>
            )}

            {activeTab === "crop" && (
              <div className="space-y-4">
                <p className="text-xs text-white/50">
                  Adjust the crop insets. Use 0 to keep the full edge, or increase to trim.
                </p>
                {[
                  { label: "Top trim", key: "top" as const },
                  { label: "Bottom trim", key: "bottom" as const },
                  { label: "Left trim", key: "left" as const },
                  { label: "Right trim", key: "right" as const },
                ].map((s) => (
                  <div key={s.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-white/60">{s.label}</p>
                      <p className="text-xs font-mono text-white/40">{crop[s.key]}%</p>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={crop[s.key]}
                      onChange={(e) => setCrop((c) => ({ ...c, [s.key]: Number(e.target.value) }))}
                      className="w-full accent-[var(--color-secondary)]"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCrop({ top: 0, right: 0, bottom: 0, left: 0 })}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70"
                >
                  <RotateCw className="h-3 w-3" />
                  Reset crop
                </button>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="px-4 pb-1 text-xs text-red-300">
              {error}
            </p>
          )}

          {/* Save / Return buttons */}
          <div className="flex gap-3 border-t border-white/10 px-4 py-4">
            <button
              type="button"
              onClick={tryClose}
              className="flex-1 rounded-full border border-white/20 py-3 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Return to edit
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={uploading}
              className="flex-1 rounded-full bg-[var(--color-action-primary)] py-3 text-sm font-semibold text-[var(--color-action-primary-text)] transition hover:opacity-90 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Save image"}
            </button>
          </div>
        </div>

        {/* Hidden canvas for export */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </>
  );
}
