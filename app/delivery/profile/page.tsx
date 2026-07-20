"use client";

import Link from "next/link";
import { Truck } from "lucide-react";

export default function DeliveryProfilePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--ms-soft-bg)] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EA580C]/10">
        <Truck className="h-8 w-8 text-[#EA580C]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--ms-charcoal)]">Become a delivery rider</h1>
        <p className="mt-2 text-sm text-[var(--ms-mauve)]">
          Rider onboarding is coming soon. We will reach out when it launches in your area.
        </p>
      </div>
      <Link
        href="/auth/sign-up"
        className="rounded-full bg-[#EA580C] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Back to sign up
      </Link>
    </div>
  );
}
