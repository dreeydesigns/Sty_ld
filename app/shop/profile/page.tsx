"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function ShopProfilePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--surface-card)] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-secondary)]/10">
        <ShoppingBag className="h-8 w-8 text-[var(--color-secondary)]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-secondary)]">Set up your shop</h1>
        <p className="mt-2 text-sm text-[var(--color-secondary)]">
          Shop profile setup is coming soon. Contact us to get early access.
        </p>
      </div>
      <Link
        href="/auth/sign-up"
        className="rounded-full bg-[var(--color-secondary)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Back to sign up
      </Link>
    </div>
  );
}
