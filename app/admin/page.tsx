import { Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SuperAdminPanel } from "@/components/super-admin-panel";
import { AdminReviewQueue } from "@/components/admin-review-queue";

export const metadata = {
  title: "Admin | Styld",
  description: "Super Admin control room for Styld.",
};

export default function AdminPage() {
  return (
    <AppShell
      allowedRoles={["super_admin"]}
      currentNav="profile"
      requireSession
    >
      <Suspense fallback={<div role="status" aria-label="Loading the admin workspace" className="loader-bloom mx-auto mt-16 h-14 w-14" />}>
        <Link href="/admin/security" data-tour="admin-security-link" className="mb-6 block rounded-xl border p-4 font-semibold">Account security, sessions and provider approvals →</Link>
        <div className="mb-6">
          <AdminReviewQueue />
        </div>
        <SuperAdminPanel />
      </Suspense>
    </AppShell>
  );
}
