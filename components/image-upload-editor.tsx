"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Crop, Image as ImageIcon, RotateCw, Sliders, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type EditorTab = "filters" | "crop";
type FilterPreset = "natural" | "warm" | "cool" | "vivid" | "fade" | "bw";

interface FilterState {
  brightness: number; // 0–200 (100 = neutral)
  contrast: number;   // 0–200
  saturation: number; // 0–200
  preset: FilterPreset;
}

interface CropState {
  top: number;    // percent 0–50
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

// Client-side image compression utility
function compressImage(
  file: File,
  maxDimension = 1200,
  quality = 0.8
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize if exceeding maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2D context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const compressedSize = Math.round((dataUrl.length - 22) * 3 / 4);

        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize,
        });
      };
      img.onerror = () => reject(new Error("Image load error"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
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
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
        <h3 className="text-lg font-semibold text-[var(--ms-charcoal)]">Discard changes?</h3>
        <p className="mt-2 text-sm leading-5 text-[var(--ms-mauve)]">
          Your edits (filters and crop) have not been saved. If you exit now they will be lost.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Discard changes &amp; exit
          </button>
          <button
            type="button"
            onClick={onReturn}
            className="rounded-full border border-[var(--ms-border)] px-5 py-3 text-sm font-semibold text-[var(--ms-charcoal)] transition hover:border-[var(--ms-plum)] hover:text-[var(--ms-plum)]"
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
  requirements = "JPG, PNG or WEBP · Max 5 MB",
  aspectHint,
  maxMB = 5,
  onSave,
  value,
  className,
}: ImageUploadEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"idle" | "editing">("idle");
  const [activeTab, setActiveTab] = useState<EditorTab>("filters");
  const [rawUrl, setRawUrl] = useState<string | null>(null);       // original file blob URL
  const [savedUrl, setSavedUrl] = useState<string | null>(value ?? null); // saved result
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
    if (value) {
      setSavedUrl(value);
    }
  }, [value]);

  // ── File handling ────────────────────────────────────────────────────────

  async function readFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxMB} MB.`);
      return;
    }

    setCompressing(true);
    try {
      const compressionResult = await compressImage(file, 1200, 0.82);
      setCompressedUrl(compressionResult.dataUrl);
      setOriginalSize(compressionResult.originalSize);
      setCompressedSize(compressionResult.compressedSize);
      
      // Check dimensions
      const img = new window.Image();
      img.onload = () => {
        setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
        setRawUrl(compressionResult.dataUrl);
        setFilters({ brightness: 100, contrast: 100, saturation: 100, preset: "natural" });
        setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
        setActiveTab("filters");
        setIsConfirming(true); // Toggle confirm preview state
      };
      img.src = compressionResult.dataUrl;
    } catch (err) {
      console.error("Compression error:", err);
      setError("Failed to compress and process image. Please try again.");
    } finally {
      setCompressing(false);
    }
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

  function cancelSelection() {
    setIsConfirming(false);
    setCompressedUrl(null);
    setRawUrl(null);
    setImageSize(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function openAdvancedEditor() {
    setMode("editing");
  }

  // ── Apply preset ─────────────────────────────────────────────────────────

  function applyPreset(key: FilterPreset) {
    const preset = PRESETS.find((p) => p.key === key)!;
    setFilters({ brightness: preset.brightness, contrast: preset.contrast, saturation: preset.saturation, preset: key });
  }

  // ── Direct finalize save from preview ───────────────────────────────────────

  async function handleFinalizeDirectUpload() {
    if (!compressedUrl || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: compressedUrl, folder: "mobile-salon/user-uploads" }),
      });
      if (res.ok) {
        const json = (await res.json()) as { ok: boolean; url?: string };
        const finalUrl = json.ok && json.url ? json.url : compressedUrl;
        setSavedUrl(finalUrl);
        onSave(finalUrl);
        setIsConfirming(false);
      } else {
        // Fallback to data URL
        setSavedUrl(compressedUrl);
        onSave(compressedUrl);
        setIsConfirming(false);
      }
    } catch (err) {
      console.error("Upload error:", err);
      // Fallback to data URL
      setSavedUrl(compressedUrl);
      onSave(compressedUrl);
      setIsConfirming(false);
    } finally {
      setUploading(false);
    }
  }

  // ── Save: render canvas → upload to Cloudinary → call onSave with URL ───────

  function handleSave() {
    if (!rawUrl || uploading) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const cx = (crop.left / 100) * srcW;
      const cy = (crop.top / 100) * srcH;
      const cw = srcW - (crop.left / 100) * srcW - (crop.right / 100) * srcW;
      const ch = srcH - (crop.top / 100) * srcH - (crop.bottom / 100) * srcH;
      const canvas = canvasRef.current!;
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = filterCss(filters);
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

      // Try to upload to Cloudinary; fall back to data URL if API unavailable
      setUploading(true);
      setError(null);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, folder: "mobile-salon/user-uploads" }),
        });
        if (res.ok) {
          const json = (await res.json()) as { ok: boolean; url?: string };
          const finalUrl = json.ok && json.url ? json.url : dataUrl;
          setSavedUrl(finalUrl);
          onSave(finalUrl);
        } else {
          // API unavailable in dev or offline — use data URL as fallback
          setSavedUrl(dataUrl);
          onSave(dataUrl);
        }
      } catch {
        // Offline / API not reachable — use data URL
        setSavedUrl(dataUrl);
        onSave(dataUrl);
      } finally {
        setUploading(false);
        setIsConfirming(false);
        setMode("idle");
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
  }

  // ── Idle state: upload zone ───────────────────────────────────────────────

  if (mode === "idle") {
    return (
      <div className={className}>
        {label && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">{label}</p>
        )}
        {requirements && (
          <p className="mb-2 text-[11px] text-[var(--ms-mauve)] opacity-70">{requirements}{aspectHint ? ` · Best ratio: ${aspectHint}` : ""}</p>
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
              ? "border-[var(--ms-rose)] bg-[var(--ms-petal)]"
              : "border-[var(--ms-border)] bg-[var(--ms-soft-bg)] hover:border-[var(--ms-plum)]/40 hover:bg-white",
            isConfirming && "cursor-default border-solid border-[var(--ms-border)] bg-white hover:bg-white hover:border-[var(--ms-border)]"
          )}
          style={{ minHeight: "160px" }}
        >
          {compressing ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <svg className="animate-spin h-8 w-8 text-[var(--ms-plum)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs font-semibold text-[var(--ms-plum)]">Compressing image client-side...</p>
            </div>
          ) : isConfirming && compressedUrl ? (
            <div className="w-full flex flex-col items-center gap-4 py-2" onClick={(e) => e.stopPropagation()}>
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={compressedUrl}
                  alt="Compressed Thumbnail Preview"
                  className="max-h-40 max-w-full rounded-[16px] object-contain shadow-md border border-[var(--ms-border)] transition-transform hover:scale-[1.02]"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelSelection();
                  }}
                  className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-500 shadow-md border border-gray-100 hover:text-red-500 transition-colors"
                  title="Remove selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-center space-y-1.5 max-w-xs">
                <p className="text-sm font-bold text-[var(--ms-charcoal)]">Confirm Image Selection</p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[var(--ms-mauve)] bg-gray-50 border rounded-full px-3 py-1 shadow-sm">
                  <span className="text-[var(--ms-plum)] font-semibold">Size:</span>
                  <span className="line-through text-gray-400">{formatBytes(originalSize)}</span>
                  <span className="text-emerald-600 font-bold">→ {formatBytes(compressedSize)}</span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-100">
                    {Math.round(((originalSize - compressedSize) / originalSize) * 100)}% saved
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm mt-1">
                <button
                  type="button"
                  onClick={handleFinalizeDirectUpload}
                  disabled={uploading}
                  className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--ms-plum)] text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60 transition"
                >
                  {uploading ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                  className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--ms-border)] bg-white text-sm font-semibold text-[var(--ms-charcoal)] hover:border-[var(--ms-plum)] hover:text-[var(--ms-plum)] transition"
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
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ms-plum)]">
                <Check className="h-4 w-4 text-emerald-500" />
                Image saved — click to replace
              </div>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ms-plum)]/10">
                <Upload className="h-6 w-6 text-[var(--ms-plum)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--ms-charcoal)]">
                  {isDragging ? "Drop it here" : "Tap to upload or drag & drop"}
                </p>
                <p className="mt-1 text-xs text-[var(--ms-mauve)]">{requirements}</p>
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
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
        className="fixed inset-0 z-[9000] flex flex-col bg-[#0d1b2a]"
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
              <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] normal-case text-white/40">
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
                    ? "border-b-2 border-[var(--ms-rose)] text-white"
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
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Presets</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => applyPreset(p.key)}
                        className={cn(
                          "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                          filters.preset === p.key
                            ? "bg-[var(--ms-rose)] text-white"
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
                      className="w-full accent-[var(--ms-rose)]"
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
                      className="w-full accent-[var(--ms-rose)]"
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
              className="flex-1 rounded-full bg-[var(--ms-rose)] py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Save image ✓"}
            </button>
          </div>
        </div>

        {/* Hidden canvas for export */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </>
  );
}
