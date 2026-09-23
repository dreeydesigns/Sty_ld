/**
 * STYLD universal image picker. Every image surface must offer BOTH Take a
 * photo and Choose from photo library, then validate, preview and upload via
 * the shared /api/upload pipeline. Camera access is requested only after the
 * user explicitly taps "Take a photo".
 */
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CameraCapture } from "@/components/camera-capture";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  cameraApiAvailable,
  dataUrlToFile,
  prepareImage,
  uploadPreparedImage,
  validateImageFile,
  type PreparedImage,
} from "@/lib/image-prep";

export interface StyldImagePickerProps {
  folder?: string;
  label?: string;
  variant?: "button" | "avatar" | "sheet-only";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUploaded?: (url: string, meta: { width: number; height: number; bytes: number }) => void;
  onError?: (message: string) => void;
  className?: string;
  disabled?: boolean;
}

type PickerStep = "choice" | "camera" | "preview" | "uploading";

export function StyldImagePicker(props: StyldImagePickerProps) {
  const { folder, label = "Add photo", variant = "button", open: controlledOpen, onOpenChange, onUploaded, onError, className, disabled } = props;
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>("choice");
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [error, setError] = useState("");
  const [cameraSupported] = useState(() => cameraApiAvailable());
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const sheetId = useId();
  const open = controlledOpen ?? internalOpen;

  const setOpen = useCallback((v: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(v);
    onOpenChange?.(v);
    if (v) { setStep("choice"); setError(""); }
    else { if (prepared) URL.revokeObjectURL(prepared.previewUrl); setPrepared(null); setError(""); }
  }, [controlledOpen, onOpenChange, prepared]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  function fail(message: string) { setError(message); onError?.(message); }

  async function acceptFile(file: File) {
    const validation = validateImageFile(file);
    if (!validation.ok) { fail(validation.error); return; }
    try {
      const image = await prepareImage(file);
      setPrepared(image); setError(""); setStep("preview");
    } catch (err) {
      fail(err instanceof Error ? err.message : "That image could not be processed. Please try another photo.");
    }
  }

  function onLibraryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (file) void acceptFile(file);
  }

  function onCaptureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (file) void acceptFile(file);
  }

  function onCameraShot(mediaUrl: string, mediaType: "image" | "video") {
    if (mediaType !== "image") { fail("Only still photos are supported here. Please take a photo instead."); return; }
    try { void acceptFile(dataUrlToFile(mediaUrl)); }
    catch { fail("That photo could not be processed. Please try again."); }
  }

  async function onUpload() {
    if (!prepared) return;
    setStep("uploading"); setError("");
    const result = await uploadPreparedImage(prepared.file, folder);
    if (result.ok && result.url) {
      onUploaded?.(result.url, { width: prepared.width, height: prepared.height, bytes: prepared.bytes });
      setOpen(false);
    } else {
      setStep("preview");
      fail(result.error || "Upload failed. Please try again.");
    }
  }

  function onDiscard() {
    if (prepared) URL.revokeObjectURL(prepared.previewUrl);
    setPrepared(null); setError(""); setStep("choice");
  }

  const trigger = variant === "sheet-only" ? null : variant === "avatar" ? (
    <button type="button" onClick={() => setOpen(true)} disabled={disabled} aria-label={label}
      className={cn("flex items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--color-secondary)] transition hover:brightness-95 disabled:opacity-50", className)}>
      <ImagePlus className="h-5 w-5" />
    </button>
  ) : (
    <button type="button" onClick={() => setOpen(true)} disabled={disabled}
      className={cn("inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-2.5 text-[13px] font-semibold text-[var(--text-primary)] transition hover:brightness-95 disabled:opacity-50", className)}>
      <ImagePlus className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <>
      {trigger}
      <input ref={libraryInputRef} type="file" accept={IMAGE_ACCEPT_ATTRIBUTE} className="hidden" aria-hidden="true" tabIndex={-1} onChange={onLibraryChange} />
      <input ref={captureInputRef} type="file" accept="image/*" capture="environment" className="hidden" aria-hidden="true" tabIndex={-1} onChange={onCaptureChange} />
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby={`${sheetId}-title`}
            className="w-full max-w-sm overflow-hidden rounded-t-[28px] bg-[var(--surface-card)] border border-[var(--border-subtle)] sm:rounded-[28px]"
            onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--border-subtle)]" />
            <div className="p-6">
              {step === "choice" && (
                <>
                  <h2 id={`${sheetId}-title`} className="text-[18px] font-bold text-[var(--text-primary)]">{label}</h2>
                  <p className="mt-1 text-[13px] text-[var(--color-secondary)]">Take a new photo or choose one from your photo library.</p>
                  <div className="mt-4 space-y-2">
                    <button type="button" onClick={() => (cameraSupported ? setStep("camera") : captureInputRef.current?.click())}
                      className="flex w-full items-center gap-3 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3.5 text-left transition hover:brightness-95">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--surface-card)]">
                        <Camera className="h-5 w-5 text-[var(--color-secondary)]" strokeWidth={1.85} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-[var(--text-primary)]">Take a photo</span>
                        <span className="block text-[12px] text-[var(--color-secondary)]">{cameraSupported ? "Use your camera now" : "Open the camera"}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => libraryInputRef.current?.click()}
                      className="flex w-full items-center gap-3 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3.5 text-left transition hover:bg-[var(--surface-elevated)]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--surface-elevated)]">
                        <ImagePlus className="h-5 w-5 text-[var(--color-secondary)]" strokeWidth={1.85} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-[var(--text-primary)]">Choose from photo library</span>
                        <span className="block text-[12px] text-[var(--color-secondary)]">JPG, PNG, WEBP or GIF</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => setOpen(false)}
                      className="w-full rounded-full border border-[var(--border-subtle)] py-3 text-[13px] font-semibold text-[var(--text-primary)]">
                      Cancel
                    </button>
                  </div>
                  {error && (<p role="alert" className="mt-3 text-[12px] leading-5 text-red-600">{error}</p>)}
                </>
              )}
              {(step === "preview" || step === "uploading") && (
                <>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 id={`${sheetId}-title`} className="text-[18px] font-bold text-[var(--text-primary)]">
                      {step === "uploading" ? "Uploading…" : "Review your photo"}
                    </h2>
                    <button type="button" onClick={onDiscard} aria-label="Choose a different photo" disabled={step === "uploading"}
                      className="rounded-full p-1 text-[var(--color-secondary)] hover:bg-[var(--surface-elevated)] disabled:opacity-50">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {prepared && (
                    <div className="overflow-hidden rounded-[20px] border border-[var(--border-subtle)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={prepared.previewUrl} alt="Selected photo preview" className="max-h-64 w-full object-cover" />
                    </div>
                  )}
                  {error && (
                    <p role="alert" className="mt-3 rounded-[12px] border border-red-300/60 bg-red-50 px-3 py-2.5 text-[12px] leading-5 text-red-700">
                      {error}
                    </p>
                  )}
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={onDiscard} disabled={step === "uploading"}
                      className="flex-1 rounded-full border border-[var(--border-subtle)] py-3 text-[13px] font-semibold text-[var(--text-primary)] disabled:opacity-50">
                      {error ? "Try a different photo" : "Retake"}
                    </button>
                    <button type="button" onClick={onUpload} disabled={step === "uploading" || !prepared}
                      className="flex-1 rounded-full bg-[var(--color-action-primary)] py-3 text-[13px] font-bold text-[var(--color-action-primary-text)] transition hover:brightness-110 disabled:opacity-60">
                      {step === "uploading" ? "Uploading…" : error ? "Retry upload" : "Use photo"}
                    </button>
                  </div>
                </>
              )}
              {step === "camera" && (
                <>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 id={`${sheetId}-title`} className="text-[18px] font-bold text-[var(--text-primary)]">Take a photo</h2>
                    <button type="button" onClick={() => setStep("choice")} aria-label="Back to photo options"
                      className="rounded-full p-1 text-[var(--color-secondary)] hover:bg-[var(--surface-elevated)]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative overflow-hidden rounded-[20px] bg-black">
                    <CameraCapture allowVideo={false} onClose={() => setStep("choice")} onCapture={onCameraShot} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
