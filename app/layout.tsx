import "./globals.css";
import { ThemeApplicator } from "@/components/theme-applicator";


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
          {children}
        </>
      </body>
    </html>
  );
}

