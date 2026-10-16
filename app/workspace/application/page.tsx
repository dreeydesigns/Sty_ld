"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Clock, XCircle, CheckCircle, AlertCircle, BriefcaseBusiness, Building2, Mail, ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { readAppSession } from "@/lib/client-session";
import { cn } from "@/lib/utils";

export default function ApplicationStatusPage() {
  const router = useRouter();

  const session = readAppSession();
  const isGuest = !session || session.role === "guest";

  const [applications, setApplications] = useState<{ role: string; status: string; created_at?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/workspaces")
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Authentication required. Please sign in again.");
          }
          throw new Error("Failed to load applications. Please try again.");
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setApplications(Array.isArray(data.applications) ? data.applications : []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setError(error.message || "Unable to load applications. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

      return () => {
        cancelled = true;
      };
    }, []);

  if (isGuest) {
    return (
      <AppShell currentNav="profile" allowedRoles={["guest", "client", "professional", "salon", "super_admin"]}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-semibold">Please sign in</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Sign in to view your application status.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/auth/sign-in?returnTo=/workspace/application" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Sign in</Link>
            <Link href="/discover" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Discover</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Approved", description: "Your application has been approved. You now have access to the workspace." };
      case "pending":
        return { icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Under Review", description: "Your application is being reviewed. We'll notify you once a decision is made." };
      case "rejected":
        return { icon: XCircle, color: "text-red-600 bg-red-50 border-red-200", label: "Not Approved", description: "Your application was not approved. You can submit a new application if you'd like." };
      default:
        return { icon: AlertCircle, color: "text-slate-600 bg-slate-50 border-slate-200", label: status, description: "Unknown status." };
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "professional": return BriefcaseBusiness;
      case "salon": return Building2;
      default: return Mail;
    }
  };

  if (loading) {
    return (
      <AppShell currentNav="profile" allowedRoles={["guest", "client", "professional", "salon", "super_admin"]}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="loader-bloom mx-auto h-16 w-16" />
          <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading your applications...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentNav="profile" allowedRoles={["guest", "client", "professional", "salon", "super_admin"]}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/account" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Account
        </Link>

        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)]">Application Status</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Track the status of your workspace applications.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {applications.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-8 text-center">
            <p className="text-base text-[var(--text-secondary)]">You haven&apos;t submitted any workspace applications yet.</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Applications for Professional and Salon workspaces are reviewed by our team.</p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Link href="/onboarding/professional" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-white">Apply as Professional</Link>
              <Link href="/onboarding/salon" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">Apply as Salon</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const config = getStatusConfig(app.status);
              const RoleIcon = getRoleIcon(app.role);
              return (
                <article key={app.role} className={`rounded-[20px] border p-5 ${config.color}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <RoleIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)] capitalize">{app.role}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.color}`}>
                          <config.icon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{config.description}</p>
                      {app.createdAt && (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">Submitted: {new Date(app.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="mt-8 rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-6">
            <h3 className="font-semibold text-[var(--text-primary)]">What happens next?</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex gap-2"><span className="text-amber-600">⏳</span> Our team reviews applications and will notify you of the decision.</li>
              <li className="flex gap-2"><span className="text-emerald-600">✓</span> If approved, you&apos;ll get access to your workspace.</li>
              <li className="flex gap-2"><span className="text-amber-600">⏳</span> If more info is needed, we&apos;ll reach out to the contact you provided.</li>
              <li className="flex gap-2"><span className="text-red-600">✗</span> If not approved, you can submit a new application with updated details.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link href="/account" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)]">
              Back to Account Hub
            </Link>
            <Link href="/discover" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 text-sm font-semibold text-[var(--text-primary)]">
              Discover
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case "approved":
      return { icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Approved", description: "Your application has been approved. You now have access to the workspace." };
    case "pending":
      return { icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Under Review", description: "Your application is being reviewed. We'll notify you once a decision is made." };
    case "rejected":
      return { icon: XCircle, color: "text-red-600 bg-red-50 border-red-200", label: "Not Approved", description: "Your application was not approved. You can submit a new application if you'd like." };
    default:
      return { icon: AlertCircle, color: "text-slate-600 bg-slate-50 border-slate-200", label: status, description: "Unknown status." };
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case "professional": return BriefcaseBusiness;
    case "salon": return Building2;
    default: return Mail;
  }
}