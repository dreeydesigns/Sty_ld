"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, AlertCircle, Sparkles, Send, X, CheckCircle2 } from "lucide-react";

interface FeedbackModalProps {
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export function FeedbackModal({ onClose, userEmail = "", userName = "" }: FeedbackModalProps) {
  const t = (k: string) => k;
  const [category, setCategory] = useState<"issue" | "feature_request" | "other">("issue");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName || "Styld User",
          email: email || "feedback@styld.app",
          subject: `[${category.toUpperCase()}] In-App Feedback`,
          message: description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit feedback");
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Failed to submit feedback:", err);
      setErrorMsg(err?.message || t("feedback_error") || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" 
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[0_24px_64px_-12px_rgba(29,29,27,0.22)]"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
        >
          <X className="h-4 w-4" />
        </button>

        {success ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" strokeWidth={1.85} />
            </span>
            <h3 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
              {t("feedback_success") || "Thank you for your feedback!"}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-6 px-4">
              Our team has received your report and will look into it shortly.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-[var(--color-action-primary)] px-6 py-2.5 text-sm font-bold text-[var(--color-action-primary-text)] hover:opacity-90 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--color-clay-text)]">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Support</p>
                <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{t("feedback") || "Provide Feedback"}</h2>
              </div>
            </div>

            {/* Category Select */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                {t("feedback_category") || "Feedback Category"}
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("issue")}
                  className={`flex flex-col items-center gap-1.5 rounded-[18px] border p-3 text-center transition ${
                    category === "issue"
                      ? "border-[var(--color-clay)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold">Issue</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("feature_request")}
                  className={`flex flex-col items-center gap-1.5 rounded-[18px] border p-3 text-center transition ${
                    category === "feature_request"
                      ? "border-[var(--color-clay)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold">Feature</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("other")}
                  className={`flex flex-col items-center gap-1.5 rounded-[18px] border p-3 text-center transition ${
                    category === "other"
                      ? "border-[var(--color-clay)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs font-semibold">Other</span>
                </button>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]" htmlFor="feedback-email">
                Contact Email
              </label>
              <input
                id="feedback-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--color-clay)] transition"
              />
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]" htmlFor="feedback-description">
                Description
              </label>
              <textarea
                id="feedback-description"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("feedback_description") || "Tell us what happened or what you'd like to see..."}
                className="mt-2 w-full resize-none rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--color-clay)] transition"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">{errorMsg}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-[var(--border-subtle)] py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                disabled={loading || !description.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--color-action-primary)] py-3 text-sm font-bold text-[var(--color-action-primary-text)] hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                <Send className="h-4 w-4" />
                {loading ? (t("submitting") || "Submitting…") : (t("submit") || "Submit report")}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
