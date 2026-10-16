"use client";

import { Heart } from "lucide-react";

interface FollowButtonProps {
  type: "professionals" | "salons";
  slug: string;
  className?: string;
}

/**
 * CONTAINMENT (Phase 8B-A): following is account-owned state that was stored in
 * shared browser storage, so it is not available yet. The approved design is
 * kept, but the control is disabled and clearly labelled instead of pretending
 * a follow was saved for the current account.
 */
export function FollowButton({ type, slug, className }: FollowButtonProps) {
  const label = "Following isn't available yet";

  return (
    <button
      type="button"
      disabled
      aria-label={label}
      title={label}
      data-follow-target={`${type}:${slug}`}
      className={[
        "inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-white/30 bg-white/12 px-5 py-2.5 text-sm font-semibold text-white opacity-70 backdrop-blur",
        className ?? "",
      ].join(" ")}
    >
      <Heart className="h-4 w-4 fill-none" />
      Follow
    </button>
  );
}
