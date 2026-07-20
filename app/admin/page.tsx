import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { SuperAdminPanel } from "@/components/super-admin-panel";

export const metadata = {
  title: "Admin — Mobile Salon",
  description: "Super Admin control room for Mobile Salon.",
};

export default function AdminPage() {
  return (
    <AppShell
      allowedRoles={["super_admin"]}
      currentNav="profile"
      requireSession
    >
      <Suspense fallback={<div className="loader-bloom mx-auto mt-16 h-14 w-14" />}>
        <SuperAdminPanel />
      </Suspense>
    </AppShell>
  );
}
