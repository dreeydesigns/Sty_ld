"use client";

import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { RoleProfileWorkspace } from "@/components/role-profile-workspace";
import { ClientRatingFlow } from "@/components/service-session";
import { ProfileCompletionMeter } from "@/components/wow-ux";

export default function ProfilePage() {
  return (
    <AppShell
      allowedRoles={["client", "professional", "salon", "shop", "delivery", "super_admin"]}
      currentNav="profile"
      roleMode="salons"
      requireSession
    >
      <ClientRatingFlow />
      {/* Profile completion nudge — disappears once profile is 100% */}
      <ProfileCompletionMeter className="mb-5" />
      <Suspense fallback={<div className="loader-bloom mx-auto mt-16 h-14 w-14" />}>
        <RoleProfileWorkspace />
      </Suspense>
    </AppShell>
  );
}
