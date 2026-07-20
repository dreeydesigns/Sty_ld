import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ThemeApplicator } from "@/components/theme-applicator";
import { ToastContainer } from "@/components/toast-container";
import { SessionExpiryModal } from "@/components/session-expiry-modal";

/* Inline script to set theme/zoom attributes, avoiding direct style attribute manipulation */
const NO_FLASH_SCRIPT = `
try {
  var s = JSON.parse(localStorage.getItem('ms_app_settings.v1') || '{}');
  var h = document.documentElement;
  if (s.colorScheme) h.setAttribute('data-color-scheme', s.colorScheme);
  if (s.reduceMotion) h.setAttribute('data-reduce-motion', 'true');
  if (s.highContrast) h.setAttribute('data-high-contrast', 'true');
  // Use a data attribute for zoom to avoid React hydration mismatches
  var zoom = {small:'0.9', medium:'1', large:'1.15'};
  h.setAttribute('data-zoom', zoom[s.textSize] || '1');
  var lang = JSON.parse(localStorage.getItem('ms_language_pref') || '{}');
  if (lang.code) { h.lang = lang.code; h.dir = lang.dir || 'ltr'; }
} catch(e) {}
`;

export const metadata: Metadata = {
  title: { default: "Mobile Salon", template: "%s | Mobile Salon" },
  description: "Mobile-first Nairobi beauty marketplace.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#3A183A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="en" 
      className="h-full antialiased zoom-initial" 
      data-scroll-behavior="smooth"
      suppressHydrationWarning   // ← add this
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-full bg-[var(--ms-soft-bg)] font-sans text-[var(--ms-charcoal)]">
        <ThemeApplicator />
        {children}
        <ToastContainer />
        <SessionExpiryModal />
        <ScrollToTop />
      </body>
    </html>
  );
}