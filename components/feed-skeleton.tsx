"use client";

// One skeleton shape, used both by a route's own loading state and by the Suspense boundary that
// covers a route before it hydrates. The box sizes match the real card, so the content arriving
// does not push the page around, and nothing here invents a name, a price or a rating: the only
// words are the status.
export function FeedSkeleton({ label = "Loading", cards = 4 }: { label?: string; cards?: number }) {
  return (
    <div role="status" aria-label={label} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: cards }, (_, index) => (
        <div key={`feed-skeleton-${index}`} aria-hidden="true" className="animate-pulse overflow-hidden rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="aspect-[4/5] w-full bg-[var(--bg-surface-raised)]" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-3/4 rounded bg-[var(--bg-surface-raised)]" />
            <div className="h-3 w-1/2 rounded bg-[var(--bg-surface-raised)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
