"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import {
  isSaved,
  toggleSave,
  SOCIAL_CHANGE_EVENT,
} from "@/lib/social-store";

interface FollowButtonProps {
  type: "professionals" | "salons";
  slug: string;
  className?: string;
}

export function FollowButton({ type, slug, className }: FollowButtonProps) {
  const [saved, setSaved] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setSaved(isSaved(type, slug));

    function sync() {
      setSaved(isSaved(type, slug));
    }

    window.addEventListener(SOCIAL_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SOCIAL_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [type, slug]);

  function handleClick() {
    const next = toggleSave(type, slug);
    setSaved(next);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
  }

  return (
    <button
      aria-label={saved ? "Unfollow" : "Follow"}
      onClick={handleClick}
      className={[
        "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200",
        saved
          ? "bg-[var(--ms-rose)] text-white shadow-[0_8px_22px_rgba(212,83,126,0.32)]"
          : "border border-white/30 bg-white/12 text-white backdrop-blur hover:bg-white/20",
        animating ? "scale-90" : "scale-100",
        className ?? "",
      ].join(" ")}
    >
      <Heart
        className={["h-4 w-4 transition-all", saved ? "fill-white" : "fill-none"].join(" ")}
      />
      {saved ? "Following" : "Follow"}
    </button>
  );
}
