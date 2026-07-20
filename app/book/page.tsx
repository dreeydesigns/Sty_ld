import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { BookingExperience } from "@/components/booking-experience";
import { SectionReveal } from "@/components/marketplace-ui";

export default function BookPage() {
  return (
    <AppShell allowedRoles={["client", "super_admin"]} currentNav="book" roleMode="salons" requireSession>
      <Suspense
        fallback={
          <SectionReveal className="silk-panel rounded-[36px] p-8 text-center">
            <div className="loader-bloom mx-auto h-16 w-16" />
            <p className="mt-6 font-script text-4xl text-[var(--ms-rose)]">Almost there</p>
            <p className="mt-2 text-sm text-[var(--ms-mauve)]">Preparing your beauty request.</p>
          </SectionReveal>
        }
      >
        <BookingExperience />
      </Suspense>
    </AppShell>
  );
}
