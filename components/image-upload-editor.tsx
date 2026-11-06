"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Crop, RotateCw, Sliders, Upload, X, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  cameraApiAvailable,
  isPendingMediaUrl,
  openPendingMediaWindow,
  type PreparedImage,
  type UploadedImageMetadata,
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
import { PendingMediaImage } from "@/components/pending-media-image";

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
  /** The saved server URL is acknowledged only after the caller accepts it. */
  onSave: (url: string, metadata?: UploadedImageMetadata) => void | boolean | Promise<void | boolean>;
  preparedImage?: PreparedImage;
  onCancel?: () => void;
  folder?: string;
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
  preparedImage,
  onCancel,
  folder = "mobile-salon/user-uploads",
  value,
  className,
}: ImageUploadEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preparedUrlRef = useRef<string | null>(null);
  const preparedFileRef = useRef<File | null>(null);
  const busyRef = useRef(false);
  const selectionVersion = useRef(0);
  const stagedUpload = useRef<{ key: string | File; url: string; metadata: UploadedImageMetadata } | null>(null);
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
  const [rotating, setRotating] = useState(false);
  const [quarterTurns, setQuarterTurns] = useState(0);

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
    quarterTurns !== 0 ||
    filters.brightness !== 100 ||
    filters.contrast !== 100 ||
    filters.saturation !== 100 ||
    crop.top !== 0 ||
    crop.right !== 0 ||
    crop.bottom !== 0 ||
    crop.left !== 0;

  useEffect(() => {
    if (!preparedImage) return;
    selectionVersion.current++;
    const ownUrl = URL.createObjectURL(preparedImage.file);
    preparedUrlRef.current = ownUrl;
    preparedFileRef.current = preparedImage.file;
    stagedUpload.current = null;
    setCompressedUrl(ownUrl);
    setRawUrl(ownUrl);
    setImageSize({ w: preparedImage.width, h: preparedImage.height });
    setOriginalSize(preparedImage.file.size);
    setCompressedSize(preparedImage.bytes);
    setFilters({ brightness: 100, contrast: 100, saturation: 100, preset: 'natural' });
    setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
    setQuarterTurns(0);
    setMode('editing');
    setIsConfirming(true);
    return () => { selectionVersion.current++; URL.revokeObjectURL(ownUrl); if (preparedUrlRef.current === ownUrl) preparedUrlRef.current = null; };
  }, [preparedImage]);

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
    if (busyRef.current) return;
    const version = ++selectionVersion.current;
    stagedUpload.current = null;
    setError(null);
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setCompressing(true);
    try {
      const image = await prepareImage(file);
      if (version !== selectionVersion.current) { URL.revokeObjectURL(image.previewUrl); return; }
      if (preparedUrlRef.current) URL.revokeObjectURL(preparedUrlRef.current);
      preparedUrlRef.current = image.previewUrl;
      preparedFileRef.current = image.file;
      setCompressedUrl(image.previewUrl);
      setOriginalSize(file.size);
      setCompressedSize(image.bytes);
      setImageSize({ w: image.width, h: image.height });
      setFilters({ brightness: 100, contrast: 100, saturation: 100, preset: "natural" });
      setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
      setQuarterTurns(0);
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
    e.target.value = "";
    if (file) void readFile(file);
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
      selectionVersion.current++;
      if (preparedUrlRef.current) URL.revokeObjectURL(preparedUrlRef.current);
    },
    []
  );

  function cancelSelection() {
    if (busyRef.current) return;
    selectionVersion.current++;
    stagedUpload.current = null;
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

  async function rotateClockwise() {
    if (!rawUrl || rotating || uploading) return;
    setRotating(true);
    setError(null);
    try {
      const image = new window.Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("We could not rotate that photo. Try choosing it again."));
        image.src = rawUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalHeight;
      canvas.height = image.naturalWidth;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not rotate this photo.");
      context.translate(canvas.width, 0);
      context.rotate(Math.PI / 2);
      context.drawImage(image, 0, 0);
      // Keep the working pixels lossless until the final JPEG export.
      setRawUrl(canvas.toDataURL("image/png"));
      setCrop((previous) => ({ top: previous.left, right: previous.top, bottom: previous.right, left: previous.bottom }));
      setQuarterTurns((previous) => (previous + 1) % 4);
    } catch (error) {
      setError(error instanceof Error ? error.message : "We could not rotate that photo. Please try again.");
    } finally {
      setRotating(false);
    }
  }

  function applyPreset(key: FilterPreset) {
    const preset = PRESETS.find((p) => p.key === key)!;
    setFilters({ brightness: preset.brightness, contrast: preset.contrast, saturation: preset.saturation, preset: key });
  }

  // ── Direct finalize save from preview ───────────────────────────────────────

  async function uploadAndAccept(file: File, metadata: UploadedImageMetadata, key: string | File) {
    const version = selectionVersion.current;
    let staged = stagedUpload.current?.key === key ? stagedUpload.current : null;
    if (!staged) {
      const result = await uploadPreparedImage(file, folder);
      if (version !== selectionVersion.current) return false;
      if (!result.ok || !result.url) throw new Error(result.error || 'Upload failed. Please try again.');
      staged = { key, url: result.url, metadata: result.metadata ?? metadata };
      stagedUpload.current = staged;
    } else if (isPendingMediaUrl(staged.url)) {
      const access = await openPendingMediaWindow(staged.url);
      if (!access.ok) throw new Error(access.error);
    }
    if (version !== selectionVersion.current) return false;
    const accepted = await onSave(staged.url, staged.metadata);
    if (version !== selectionVersion.current) return false;
    if (accepted === false) throw new Error('We could not save your photo. Please try again.');
    setSavedUrl(staged.url);
    setIsConfirming(false);
    setCompressedUrl(null);
    setRawUrl(null);
    preparedFileRef.current = null;
    stagedUpload.current = null;
    releasePreparedUrl();
    setMode('idle');
    return true;
  }

  async function handleFinalizeDirectUpload() {
    const file = preparedFileRef.current;
    if (!file || !compressedUrl || busyRef.current) return;
    if (!imageSize || !(imageSize.w > 0) || !(imageSize.h > 0)) { setError('Choose the photo again so its dimensions can be read.'); return; }
    busyRef.current = true;
    setUploading(true);
    setError(null);
    try {
      await uploadAndAccept(file, { width: imageSize.w, height: imageSize.h, bytes: file.size }, file);
    } catch (error) { setError(error instanceof Error ? error.message : 'We could not save your photo. Please try again.'); }
    finally { busyRef.current = false; setUploading(false); }
  }

  async function handleSave() {
    if (!rawUrl || busyRef.current || rotating) return;
    if (!hasEdits) { await handleFinalizeDirectUpload(); return; }
    const version = selectionVersion.current;
    busyRef.current = true;
    setUploading(true);
    setError(null);
    try {
      const img = new window.Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('We could not reopen that image. Please choose it again.')); img.src = rawUrl; });
      if (version !== selectionVersion.current) return;
      const srcW = img.naturalWidth, srcH = img.naturalHeight;
      const cx = (crop.left / 100) * srcW, cy = (crop.top / 100) * srcH;
      const cw = Math.round(srcW - ((crop.left + crop.right) / 100) * srcW);
      const ch = Math.round(srcH - ((crop.top + crop.bottom) / 100) * srcH);
      if (!(cw > 0) || !(ch > 0)) throw new Error('That crop leaves no image. Reduce the trim and try again.');
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Your browser could not process this image. Please try another photo.');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not process this image. Please try another photo.');
      const supportsCanvasFilter = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;
      ctx.filter = supportsCanvasFilter ? filterCss(filters) : 'none';
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
      if (!supportsCanvasFilter) {
        const pixels = ctx.getImageData(0, 0, cw, ch);
        adjustImagePixels(pixels.data, filters);
        ctx.putImageData(pixels, 0, 0);
      }
      const file = dataUrlToFile(canvas.toDataURL('image/jpeg', 0.82), 'edited-photo.jpg');
      await uploadAndAccept(file, { width: cw, height: ch, bytes: file.size }, JSON.stringify([rawUrl, crop, filters]));
    } catch (error) { setError(error instanceof Error ? error.message : 'We could not save your photo. Please try again.'); }
    finally { busyRef.current = false; setUploading(false); }
  }

  // ── Discard ───────────────────────────────────────────────────────────────

  function tryClose() {
    if (rotating || busyRef.current) return;
    if (hasEdits) {
      setShowDiscard(true);
    } else {
      if (onCancel) onCancel(); else setMode("idle");
    }
  }

  function confirmDiscard() {
    if (onCancel) { onCancel(); return; }
    setShowDiscard(false);
    setMode("idle");
    setRawUrl(null);
    setCompressedUrl(null);
    setIsConfirming(false);
    setFilters({ brightness: 100, contrast: 100, saturation: 100, preset: "natural" });
    setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
    setQuarterTurns(0);
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
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
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
              <PendingMediaImage
                src={savedUrl}
                alt="Uploaded"
                className="max-h-32 max-w-full rounded-[12px] object-contain shadow"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]">
                <Check className="h-4 w-4 text-emerald-500" />
                Image saved
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
                  if (cameraApiAvailable()) setShowCamera(true); else cameraInputRef.current?.click();
                }}
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--color-clay)] hover:bg-[var(--surface-elevated)]"
              >
                <Camera className="h-4 w-4 text-[var(--color-clay-text)]" /> Take a photo
              </button>
            </>
          )}
          {!isConfirming && !compressing && <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="min-h-11 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold">{savedUrl ? 'Replace photo' : 'Choose from photo library'}</button>}
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            className="hidden" aria-hidden="true" tabIndex={-1}
            onChange={handleFileInput}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            capture="environment"
            className="hidden" aria-hidden="true" tabIndex={-1}
            onChange={handleFileInput}
          />
        </div>
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
                {quarterTurns % 2 ? imageSize.h : imageSize.w}×{quarterTurns % 2 ? imageSize.w : imageSize.h}
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

          <fieldset disabled={rotating || uploading} className="max-h-64 overflow-y-auto px-4 py-4">
            <button
              type="button"
              onClick={rotateClockwise}
              disabled={rotating || uploading}
              className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm text-white disabled:opacity-60"
            >
              <RotateCw className="h-4 w-4" />
              {rotating ? "Rotating photo..." : "Rotate photo clockwise"}
            </button>
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
                      setRawUrl(compressedUrl);
                      setQuarterTurns(0);
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
          </fieldset>

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
              disabled={uploading || rotating}
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
