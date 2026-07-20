"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ContactForm() {
  const searchParams = useSearchParams();
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [subject, setSubject] = useState(searchParams.get("subject")?.replace(/\+/g, " ") ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) { setError("Name and message are required."); return; }
    setSending(true); setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) { setDone(true); }
      else { setError(data.error ?? "Something went wrong. Please try again."); }
    } catch { setError("Network error. Please check your connection."); }
    setSending(false);
  }

  if (done) {
    return (
      <div className="rounded-[28px] bg-white p-10 text-center shadow-[0_12px_40px_rgba(13,27,42,0.08)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl">✓</div>
        <h2 className="mt-5 text-2xl font-semibold text-[var(--ms-navy)]">Message sent!</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ms-mauve)]">
          We have received your message and will get back to you within 24 hours.
        </p>
        <Link href="/" className="mt-6 inline-flex min-h-10 items-center rounded-full bg-[var(--ms-plum)] px-6 text-sm font-semibold text-white transition hover:brightness-110">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {[
        { label: "Your name", value: name, onChange: setName, required: true, type: "text" },
        { label: "Email address", value: email, onChange: setEmail, required: false, type: "email" },
        { label: "Phone number (optional)", value: phone, onChange: setPhone, required: false, type: "tel" },
        { label: "Subject", value: subject, onChange: setSubject, required: false, type: "text" },
      ].map(({ label, value, onChange, required, type }) => (
        <label key={label} className="block rounded-[20px] border border-[var(--ms-border)] bg-white px-4 py-3.5 transition focus-within:border-[var(--ms-rose)]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ms-mauve)]">{label}</span>
          <input
            type={type}
            value={value}
            required={required}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 block w-full bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]/50"
            placeholder={label}
          />
        </label>
      ))}
      <label className="block rounded-[20px] border border-[var(--ms-border)] bg-white px-4 py-3.5 transition focus-within:border-[var(--ms-rose)]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Message *</span>
        <textarea
          value={message}
          required
          rows={5}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-2 block w-full resize-none bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]/50"
          placeholder="How can we help you?"
        />
      </label>
      {error && <p className="rounded-[14px] bg-red-50 px-4 py-3 text-xs font-medium text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ms-plum)] text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-12">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--ms-mauve)] hover:text-[var(--ms-navy)]">
          ← Back to home
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ms-navy)]">Contact us</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">
          Questions, feedback, or partnership enquiries — we read every message.
        </p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-[24px] bg-white" />}>
            <ContactForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
