import type { ReactNode } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Accessible state primitives: Spinner, LoadingState, EmptyState, ErrorState.
 *
 * Presentational only (no hooks) so they can render in either server or client
 * trees. Loading announces politely via role="status"; errors announce
 * assertively via role="alert". The spinner reuses the .loader-bloom utility,
 * which is collapsed by the global reduced-motion rules.
 */

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("loader-bloom inline-block", className)} />;
}

export function LoadingState({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}
      role="status"
    >
      <Spinner className="h-10 w-10" />
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description = "",
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-12 text-center",
        className,
      )}
    >
      {icon ?? <Sparkles className="mx-auto h-6 w-6 text-[var(--color-clay)]" />}
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--color-error)] bg-[var(--bg-surface)] px-5 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="mx-auto h-6 w-6 text-[var(--color-error)]" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
