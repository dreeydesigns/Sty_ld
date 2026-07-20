import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { CounterUI } from "@/components/counter-ui";

export const metadata: Metadata = {
  title: "Counter — Beauty Products Marketplace",
  description:
    "Browse and buy genuine beauty products from verified sellers on Counter. Hair, nails, skincare, tools, and more — delivered across Nairobi.",
};

export default function CounterPage() {
  return (
    <AppShell currentNav="counter" roleMode="salons" showFooter>
      <CounterUI />
    </AppShell>
  );
}
