import type { Metadata } from "next";
import Link from "next/link";
import { ApiReachability } from "@/components/api-reachability";

export const metadata: Metadata = {
  title: "Connection status | STYLD",
  description: "Check whether this browser can reach STYLD.",
  robots: { index: false, follow: false },
};

export default function StatusPage() {
  return <main className="min-h-screen bg-[var(--bg-page)] px-4 py-10 text-[var(--text-primary)]">
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/home" className="inline-flex min-h-11 items-center underline">Back to STYLD</Link>
      <h1 className="text-2xl font-semibold">Connection status</h1>
      <p>This checks whether STYLD can respond to this browser. It does not confirm that sign-in, email delivery, saved changes or payments are working.</p>
      <ApiReachability />
    </div>
  </main>;
}
