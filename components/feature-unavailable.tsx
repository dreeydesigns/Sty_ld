import { ShieldCheck } from "lucide-react";

/**
 * Honest "feature unavailable" state used to contain surfaces that are not yet
 * backed by an authorised, account-owned data source. Rendered in place of
 * browser-local simulations so nothing is presented as genuine account data.
 */
export function FeatureUnavailable({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 text-center shadow-[0_4px_16px_rgba(13,27,42,0.05)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-elevated)]">
        <ShieldCheck className="h-7 w-7 text-[var(--color-clay)]" />
      </div>
      <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-secondary)]">
        {message}
      </p>
    </div>
  );
}
