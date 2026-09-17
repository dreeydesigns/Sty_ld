import "./globals.css";
import { ThemeApplicator } from "@/components/theme-applicator";

const themeScript = `(function() {
  try {
    var raw = localStorage.getItem("ms_app_settings.v1");
    var pref = raw ? JSON.parse(raw).colorScheme : "system";
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = pref === "dark" || (pref !== "light" && systemDark);
    var root = document.documentElement;
    root.setAttribute("data-color-scheme", isDark ? "dark" : "light");
    root.setAttribute("data-theme-preference", pref || "system");
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch(e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeApplicator />
        {children}
      </body>
    </html>
  );
}
