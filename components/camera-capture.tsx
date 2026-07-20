"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Video, X, RefreshCw } from "lucide-react";

interface CameraCaptureProps {
  onClose: () => void;
  onCapture: (mediaUrl: string, mediaType: "image" | "video") => void;
}

export function CameraCapture({ onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"image" | "video">("image");
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "loading">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and start the camera stream
  const startCamera = useCallback(async (currentFacingMode: "user" | "environment") => {
    setErrorMsg("");
    setPermissionState("loading");

    // Clean up any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      // We want video, and if video mode, also microphone
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mode === "video", // Only request audio if starting in video mode
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionState("granted");
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      setPermissionState("denied");
      const errorName = err instanceof Error ? err.name : "";
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setErrorMsg("Camera or microphone permission was denied. Please allow camera access in your settings.");
      } else {
        setErrorMsg("Could not start camera. Please verify that your camera is connected and not in use by another app.");
      }
    }
  }, [mode]);

  // Start stream when component mounts or facingMode / mode changes
  useEffect(() => {
    let active = true;

    const runAsync = async () => {
      // Defer execution to avoid synchronous state updates in the effect body
      await Promise.resolve();
      if (active) {
        startCamera(facingMode);
      }
    };

    runAsync();

    return () => {
      active = false;
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [facingMode, mode, startCamera]);

  // Flip camera (front/back)
  const toggleFacingMode = () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
  };

  // Capture a Photo
  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to jpeg DataURL
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      // Clean up stream before calling callback
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      onCapture(dataUrl, "image");
    } catch (e) {
      console.error("Canvas to DataURL failed", e);
      setErrorMsg("Failed to capture photo. Please try again.");
    }
  };

  // Start video recording
  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setRecordingSeconds(0);

    // Find a supported mime type
    const options = { mimeType: "video/webm;codecs=vp9,opus" };
    let mediaRecorder: MediaRecorder;

    try {
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
        mediaRecorder = new MediaRecorder(streamRef.current, options);
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
      } else {
        mediaRecorder = new MediaRecorder(streamRef.current);
      }
    } catch (e) {
      console.warn("MimeType not supported, falling back to default MediaRecorder", e);
      mediaRecorder = new MediaRecorder(streamRef.current);
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "video/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        onCapture(dataUrl, "video");
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100); // chunk every 100ms
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        if (prev >= 29) { // auto-stop at 30 seconds
          stopRecording();
          return 30;
        }
        return prev + 1;
      });
    }, 1000);
  };

  // Stop video recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black text-white">
      {/* Header bar */}
      <div className="relative flex h-14 shrink-0 items-center justify-between px-4 z-10 bg-black/40 backdrop-blur-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition active:scale-95"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        <div className="flex rounded-full bg-white/10 p-0.5">
          <button
            type="button"
            onClick={() => {
              if (isRecording) return;
              setMode("image");
            }}
            disabled={isRecording}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              mode === "image" ? "bg-white text-black" : "text-white/80 hover:text-white"
            }`}
          >
            Photo
          </button>
          <button
            type="button"
            onClick={() => {
              if (isRecording) return;
              setMode("video");
            }}
            disabled={isRecording}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              mode === "video" ? "bg-white text-black" : "text-white/80 hover:text-white"
            }`}
          >
            Video
          </button>
        </div>

        <div className="w-10 h-10 shrink-0" /> {/* Spacer */}
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-zinc-950">
        {permissionState === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="text-sm font-semibold text-white/70">Connecting to camera…</p>
          </div>
        )}

        {permissionState === "denied" && (
          <div className="flex max-w-xs flex-col items-center text-center p-6 bg-zinc-900 rounded-3xl border border-white/10">
            <Camera className="h-10 w-10 text-rose-500 mb-3" />
            <h3 className="font-bold text-base text-white">Camera Access Required</h3>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="mt-5 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 transition active:scale-95"
            >
              Try Again
            </button>
          </div>
        )}

        {permissionState === "granted" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Live Recording Timer Indicator overlay */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-bold animate-pulse text-white shadow-lg">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="relative h-28 shrink-0 flex items-center justify-between px-8 bg-black/60 backdrop-blur-md">
        {/* Flip Camera button (always centered left-ish) */}
        <button
          type="button"
          onClick={toggleFacingMode}
          disabled={permissionState !== "granted" || isRecording}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition active:scale-90 disabled:opacity-30"
          title="Flip camera"
        >
          <RefreshCw className="h-5 w-5 text-white" />
        </button>

        {/* Main Shutter Button */}
        <div className="flex items-center justify-center">
          {mode === "image" ? (
            <button
              type="button"
              onClick={capturePhoto}
              disabled={permissionState !== "granted"}
              className="group relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-all active:scale-90 disabled:opacity-40"
            >
              <span className="block h-14 w-14 rounded-full bg-white group-hover:scale-95 transition-all" />
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={permissionState !== "granted"}
              className="group relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-all active:scale-90 disabled:opacity-40"
            >
              {isRecording ? (
                <span className="block h-8 w-8 rounded bg-rose-600 transition-all animate-pulse" />
              ) : (
                <span className="block h-14 w-14 rounded-full bg-rose-600 group-hover:scale-95 transition-all" />
              )}
            </button>
          )}
        </div>

        {/* Right side spacer or status */}
        <div className="flex h-12 w-12 items-center justify-center text-xs text-white/50 font-mono">
          {mode === "image" ? <Camera className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </div>
      </div>
    </div>
  );
}
