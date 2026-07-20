"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type Toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const toast = (e as CustomEvent<Toast>).detail;
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3500);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[200] flex -translate-x-1/2 flex-col-reverse items-center gap-2 lg:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.22)] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-200",
            t.type === "success" && "bg-[var(--ms-plum)]",
            t.type === "error"   && "bg-red-500",
            t.type === "info"    && "bg-[var(--ms-navy)]",
          )}
        >
          {t.type === "success" && <span>✓</span>}
          {t.type === "error"   && <span>✕</span>}
          {t.type === "info"    && <span>ℹ</span>}
          {t.message}
        </div>
      ))}
    </div>
  );
}
