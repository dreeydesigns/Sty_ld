import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeApplicator } from "@/components/theme-applicator";

const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_bHVja3ktaHVza3ktMjEuY2xlcmsuYWNjb3VudHMuZGV2JA";

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
        <ClerkProvider publishableKey={clerkPublishableKey}>
          <ThemeApplicator />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

