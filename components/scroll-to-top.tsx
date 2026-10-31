"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { readSettings } from "@/lib/settings-store";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    const reduceMotion =
      readSettings().reduceMotion ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <button
      aria-label="Scroll to top"
      onClick={scrollToTop}
      type="button"
      className={[
        "fixed bottom-24 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full",
        "bg-[var(--color-ink)] text-white shadow-[0_8px_24px_rgba(13,27,42,0.24)]",
        "transition-all duration-200 hover:bg-[var(--color-accent)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary)]",
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none",
      ].join(" ")}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
