"use client";

import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { SocialHome } from "@/components/social-home";
import { ClientRatingFlow } from "@/components/service-session";

export default function HomePage() {
  return (
    <AppShell currentNav="home">
      <ClientRatingFlow />
      <Suspense fallback={<div className="loader-bloom mx-auto mt-16 h-14 w-14" />}>
        <SocialHome />
      </Suspense>
    </AppShell>
  );
}
