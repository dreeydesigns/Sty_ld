import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

/**
 * PublicLayout — clean shell for auth and public-only pages.
 * No role nav, no bottom tabs, no footer. Just the brand wordmark
 * and a safe full-height container.
 */
export function PublicLayout({
  children,
  backHref,
  backLabel = "Back",
}: {
  children: ReactNode;
  /** Optional back link shown top-left */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--ms-soft-bg)]">
      {/* Minimal header — brand only */}
      <header className="sticky top-0 z-40 border-b border-[var(--ms-border)] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1 text-xs font-medium text-[var(--ms-mauve)] transition hover:text-[var(--ms-plum)]"
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-[var(--ms-plum)]"
            style={{ marginLeft: backHref ? "auto" : 0, marginRight: backHref ? "auto" : 0 }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-black"
              style={{ background: "linear-gradient(135deg,#C8284A,#3A183A)" }}
            >
              MS
            </span>
            Mobile Salon
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      {/* Minimal footer */}
      <footer className="border-t border-[var(--ms-border)] bg-white py-5 text-center text-[11px] text-[var(--ms-mauve)]">
        <p>
          © {new Date().getFullYear()} Mobile Salon Kenya ·{" "}
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/help" className="hover:underline">
            Help
          </Link>
        </p>
      </footer>
    </div>
  );
}
