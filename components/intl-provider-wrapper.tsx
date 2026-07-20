"use client";

import { ReactNode, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import swMessages from "@/messages/sw.json";

const MESSAGES: Record<string, Record<string, string>> = {
  en: enMessages as Record<string, string>,
  sw: swMessages as Record<string, string>,
};

export function IntlProviderWrapper({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState("en");
  const [messages, setMessages] = useState<Record<string, string>>(enMessages as Record<string, string>);

  useEffect(() => {
    function loadLanguage() {
      try {
        const raw = localStorage.getItem("ms_language_pref");
        if (raw) {
          const parsed = JSON.parse(raw);
          const code = parsed.code || "en";
          const supportedCode = ["en", "sw"].includes(code) ? code : "en";
          setLocale(supportedCode);
          setMessages(MESSAGES[supportedCode] || enMessages);
        }
      } catch (err) {
        console.error("Failed to load language preference", err);
      }
    }

    loadLanguage();

    // Listen for storage or language changes
    window.addEventListener("storage", loadLanguage);
    const handleCustomChange = () => loadLanguage();
    window.addEventListener("ms-settings-change", handleCustomChange);

    return () => {
      window.removeEventListener("storage", loadLanguage);
      window.removeEventListener("ms-settings-change", handleCustomChange);
    };
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
