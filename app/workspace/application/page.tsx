"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

type Application = { role: string; status: string; name?: string };
const labels: Record<string, string> = { pending: "Under review", approved: "Approved", rejected: "Not approved" };

export default function ApplicationStatusPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setUnauthorized(false);
    fetch("/api/workspaces", { cache: "no-store" })
      .then(async response => {
        if (response.status === 401) { if (!cancelled) setUnauthorized(true); return; }
        if (!response.ok) throw new Error("Unable to load applications. Please try again.");
        const data = await response.json();
        if (!Array.isArray(data.applications)) throw new Error("Unable to load applications. Please try again.");
        if (!cancelled) setApplications(data.applications);
      })
      .catch(() => { if (!cancelled) setError("Unable to load applications. Please try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  return (
    <AppShell currentNav="profile" allowedRoles={["guest", "client", "professional", "salon", "super_admin"]}>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Link href="/account" className="underline">Back to account</Link>
        <h1 className="font-display text-3xl font-semibold">Your applications</h1>
        {loading ? <p role="status">Loading your applications...</p> : unauthorized ? (
          <Link href="/auth/sign-in?returnTo=%2Fworkspace%2Fapplication" className="underline">Sign in to view your applications</Link>
        ) : error ? (
          <div role="alert"><p>{error}</p><button className="mt-3 min-h-11 underline" onClick={() => setAttempt(n => n + 1)}>Try again</button></div>
        ) : applications.length === 0 ? (
          <p>No applications yet. <Link href="/settings/workspaces" className="underline">Apply for a workspace</Link></p>
        ) : applications.map(application => (
          <section key={application.role} className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
            <h2 className="text-xl font-semibold">{application.role === "salon" ? "Salon" : "Professional"}{application.name ? `: ${application.name}` : ""}</h2>
            <p>{labels[application.status] || "Status unavailable"}</p>
            <p className="text-sm">{application.status === "pending" ? "Your application is awaiting review. Check this page for updates." : application.status === "approved" ? "Your application was approved. Open Workspaces to select an available workspace." : application.status === "rejected" ? "You can review your details and submit a new application." : "Please contact support for help with this status."}</p>
            <Link href="/settings/workspaces" className="inline-flex min-h-11 items-center underline">Manage workspaces</Link>
          </section>
        ))}
      </main>
    </AppShell>
  );
}
