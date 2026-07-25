import { IntlProviderWrapper } from "@/components/intl-provider-wrapper";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-color-scheme="dark" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <IntlProviderWrapper>
          {children}
        </IntlProviderWrapper>
      </body>
    </html>
  );
}
