import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeApplicator } from "@/components/theme-applicator";

const themeScript = `(function() {
  try {
    var raw = localStorage.getItem("styld_settings") || localStorage.getItem("ms_app_settings.v1");
    var pref = raw ? JSON.parse(raw).colorScheme : "system";
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = pref === "dark" || (pref !== "light" && systemDark);
    var root = document.documentElement;
    var mode = isDark ? "dark" : "light";
    root.setAttribute("data-theme", mode);
    root.setAttribute("data-color-scheme", mode);
    root.setAttribute("data-theme-preference", pref || "system");
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch(e) {}
})();`;

const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_bHVja3ktaHVza3ktMjEuY2xlcmsuYWNjb3VudHMuZGV2JA";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <ClerkProvider publishableKey={clerkPublishableKey}>
          <ThemeApplicator />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
