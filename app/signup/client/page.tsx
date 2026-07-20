import type { Metadata } from "next";
import { Suspense } from "react";

import { ClientSignupFlow } from "@/components/client-signup-flow";

export const metadata: Metadata = {
  title: "Client Signup",
  description: "Create your Mobile Salon client account with a fast, privacy-first signup flow.",
};

export default function ClientSignupPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-white px-4 text-center">
          <div>
            <div className="loader-bloom mx-auto h-14 w-14" />
            <p className="mt-5 text-sm font-semibold text-[var(--ms-mauve)]">Preparing your signup.</p>
          </div>
        </main>
      }
    >
      <ClientSignupFlow />
    </Suspense>
  );
}
