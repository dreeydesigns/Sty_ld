"use client";

/**
 * Phone-first account creation form.
 *
 * P0A: the previous implementation imported a server action
 * (`app/auth/actions.ts`) that inserted a user by email and set an unsigned
 * `session = "true"` cookie — no server-side session, no proof of ownership.
 * That artifact is deleted and `session = "true"` no longer authenticates anything.
 *
 * This form now posts to `/api/auth/client/signup`, which:
 *  - issues a real server-side session (random token, sha256-hashed in the DB),
 *  - refuses an existing phone number with 409 instead of taking over the account,
 *  - always creates the account as `client` — no role is sent from the client.
 */
import { useState } from "react";

export default function SignUpForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    const payload = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const res = await fetch("/api/auth/client/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;

      if (!res.ok) {
        setError(data?.message ?? "We could not create your account. Please try again.");
        return;
      }

      setMessage("Account created. Welcome to Styld.");
      window.location.assign("/home");
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 border rounded-xl shadow-sm max-w-sm w-full">
      <h2 className="text-2xl font-semibold">Create your account</h2>

      <label htmlFor="firstName" className="text-sm font-medium">First name</label>
      <input
        id="firstName"
        name="firstName"
        type="text"
        autoComplete="given-name"
        required
        className="p-2 border rounded-md"
      />

      <label htmlFor="phone" className="text-sm font-medium">Phone number</label>
      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+254 7XX XXX XXX"
        required
        className="p-2 border rounded-md"
      />

      <label htmlFor="password" className="text-sm font-medium">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        className="p-2 border rounded-md"
      />

      <button
        type="submit"
        disabled={loading}
        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Creating..." : "Create Account"}
      </button>

      {message && <p className="text-sm text-center" role="status">{message}</p>}
      {error && <p className="text-sm text-center text-red-600" role="alert">{error}</p>}
    </form>
  );
}
