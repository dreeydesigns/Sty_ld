/**
 * Lightweight toast system — no external library, no React context.
 * Uses a module-level event emitter so any component can call showToast()
 * and the single ToastContainer picks it up.
 */

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export const TOAST_EVENT = "ms-toast";

export function showToast(message: string, type: ToastType = "success") {
  if (typeof window === "undefined") return;
  const toast: Toast = { id: `t_${Date.now()}_${Math.random()}`, message, type };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: toast }));
}
