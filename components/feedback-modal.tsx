"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, AlertCircle, Sparkles, Send, X, CheckCircle2 } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { useTranslations } from "next-intl";

interface FeedbackModalProps {
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export function FeedbackModal({ onClose, userEmail = "", userName = "" }: FeedbackModalProps) {
  const t = useTranslations("settings");
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
      const db = getFirestoreDb();
      if (!db) {
        throw new Error("Firestore database is not available");
      }

      await addDoc(collection(db, "feedback"), {
        category,
        description,
        email: email || "anonymous@styld.app",
        userName: userName || "Anonymous User",
        createdAt: serverTimestamp(),
        status: "pending",
      });

      setSuccess(true);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      setErrorMsg(t("feedback_error") || "Failed to submit feedback. Please try again.");
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
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[32px] border border-[var(--ms-border)] bg-white p-6 shadow-[0_24px_64px_-12px_rgba(58,24,58,0.22)]"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)] hover:text-[var(--ms-navy)] transition"
        >
          <X className="h-4 w-4" />
        </button>

        {success ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" strokeWidth={1.85} />
            </span>
            <h3 className="mt-4 text-xl font-bold text-[var(--ms-navy)]">
              {t("feedback_success") || "Thank you for your feedback!"}
            </h3>
            <p className="mt-2 text-sm text-[var(--ms-mauve)] leading-6 px-4">
              Our team has received your report and will look into it shortly.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-[var(--ms-plum)] px-6 py-2.5 text-sm font-bold text-white hover:brightness-110 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-[var(--ms-gold)]">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Support</p>
                <h2 className="mt-1 text-2xl font-bold text-[var(--ms-plum)]">{t("feedback") || "Provide Feedback"}</h2>
              </div>
            </div>

            {/* Category Select */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--ms-navy)]">
                {t("feedback_category") || "Feedback Category"}
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("issue")}
                  className={`flex flex-col items-center gap-1.5 rounded-[18px] border p-3 text-center transition ${
                    category === "issue"
                      ? "border-[var(--ms-gold)] bg-[var(--ms-soft-bg)] text-[var(--ms-plum)]"
                      : "border-[var(--ms-border)] bg-white text-[var(--ms-mauve)] hover:border-gray-300"
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
                      ? "border-[var(--ms-gold)] bg-[var(--ms-soft-bg)] text-[var(--ms-plum)]"
                      : "border-[var(--ms-border)] bg-white text-[var(--ms-mauve)] hover:border-gray-300"
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
                      ? "border-[var(--ms-gold)] bg-[var(--ms-soft-bg)] text-[var(--ms-plum)]"
                      : "border-[var(--ms-border)] bg-white text-[var(--ms-mauve)] hover:border-gray-300"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs font-semibold">Other</span>
                </button>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ms-navy)]" htmlFor="feedback-email">
                Contact Email
              </label>
              <input
                id="feedback-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-[18px] border border-[var(--ms-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ms-charcoal)] outline-none focus:border-[var(--ms-gold)] transition"
              />
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ms-navy)]" htmlFor="feedback-description">
                Description
              </label>
              <textarea
                id="feedback-description"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("feedback_description") || "Tell us what happened or what you'd like to see..."}
                className="mt-2 w-full resize-none rounded-[18px] border border-[var(--ms-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ms-charcoal)] outline-none focus:border-[var(--ms-gold)] transition"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-red-600">{errorMsg}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-[var(--ms-border)] py-3 text-sm font-bold text-[var(--ms-navy)] hover:bg-gray-50 transition"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                disabled={loading || !description.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--ms-plum)] py-3 text-sm font-bold text-white hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition"
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
