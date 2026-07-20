"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { recordAppVisit } from "@/lib/client-session";

export function AppUsageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    recordAppVisit();
  }, [pathname]);

  return null;
}
