import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { StyldLockup } from "@/components/styld-logo";

/**
 * PublicLayout — clean shell for auth and public-only pages.
 * Minimal header with official StyldLockup and clean footer.
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
    <div className="flex min-h-dvh flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Minimal header — brand only */}
      <header className="sticky top-0 z-40 border-b border-[var(--header-border)] bg-[var(--header-bg)] text-[var(--header-text)] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1 text-xs font-medium text-[var(--header-text-muted)] transition hover:text-[var(--header-text)]"
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-2"
            style={{ marginLeft: backHref ? "auto" : 0, marginRight: backHref ? "auto" : 0 }}
          >
            <StyldLockup size={28} variant="auto" />
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      {/* Minimal footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--footer-bg)] py-5 text-center text-[11px] text-[var(--footer-text)]">
        <p>
          {"\u00A9"} {new Date().getFullYear()} Styld Kenya {"\u00B7"}{" "}
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>{" "}
          {"\u00B7"}{" "}
          <Link href="/help" className="hover:underline">
            Help
          </Link>
        </p>
      </footer>
    </div>
  );
}
