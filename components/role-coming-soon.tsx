import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Honest placeholder for surfaces that are not open yet (Shop, Delivery).
 *
 * It deliberately collects no data, shows no operational or financial figures,
 * and offers a single safe navigation action back into the live product.
 */
export function RoleComingSoon({
  icon,
  eyebrow,
  title,
  description,
  accent,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-card)] px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        <span
          className="inline-flex h-16 w-16 items-center justify-center rounded-[22px] text-white"
          style={{ backgroundColor: accent }}
        >
          {icon}
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-secondary)]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-secondary)]">{description}</p>
        </div>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          style={{ backgroundColor: accent }}
        >
          Explore Styld
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
