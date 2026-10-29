import "./globals.css";
import type { Viewport } from "next";
import { ThemeApplicator } from "@/components/theme-applicator";
import { LegacyStorageCleanup } from "@/components/legacy-storage-cleanup";
import { WorldAtmosphere } from "@/components/world-atmosphere";
import { SignatureLoader } from "@/components/signature-loader";

// Default document title for every route that does not set its own metadata.
export const metadata = { title: "STYLD" };

// The safe-area padding in globals.css only receives real inset values on iOS
// when the viewport opts into the full screen, and the floating bottom nav is
// the element that would otherwise sit under the home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Styld is LIGHT MODE ONLY.
 *
 * The document is rendered statically in the light theme: there is no theme
 * bootstrap script, no localStorage theme read, no OS appearance check
 * and no `dark` class. Nothing mutates the theme after hydration, so there is
 * no theme flash and no theme-driven hydration mismatch.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-color-scheme="light">
      <body>
        <>
          <ThemeApplicator />
          <WorldAtmosphere />
          <LegacyStorageCleanup />
          {children}
          <SignatureLoader />
        </>
      </body>
    </html>
  );
}

