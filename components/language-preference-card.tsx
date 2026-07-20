"use client";

import { useSyncExternalStore } from "react";
import { Languages } from "lucide-react";

const languageOptions = [
  { value: "en-KE", label: "Kenyan English", note: "Default platform wording for Nairobi beauty users." },
  { value: "sw-KE", label: "Kiswahili", note: "For users who prefer Kiswahili support." },
  { value: "en", label: "English", note: "A more international English option." },
  { value: "sheng", label: "Sheng-friendly", note: "A warmer local tone for selected support moments." },
];

const STORAGE_KEY = "mobile-salon-language-preference";
const STORAGE_EVENT = "mobile-salon-language-preference-change";

export function LanguagePreferenceCard() {
  const language = useSyncExternalStore(subscribeToLanguagePreference, getStoredLanguage, getDefaultLanguage);

  const selectedLanguage = languageOptions.find((option) => option.value === language) ?? languageOptions[0];

  function handleLanguageChange(value: string) {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  return (
    <section className="beauty-card rounded-[32px] p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ms-soft-bg)] text-[var(--ms-gold)]">
          <Languages className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ms-mauve)]">Language & wording</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--ms-plum)]">Default voice: Kenyan English</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--ms-mauve)]">
            Kenyan English stays the default. Users can switch later.
          </p>
          <label className="mt-5 block" htmlFor="language-preference">
            <span className="text-sm font-semibold text-[var(--ms-navy)]">Preferred language</span>
            <select
              className="mt-2 w-full rounded-[22px] border border-[var(--ms-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ms-charcoal)] outline-none transition focus:border-[var(--ms-gold)]"
              id="language-preference"
              onChange={(event) => handleLanguageChange(event.target.value)}
              value={language}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 rounded-[20px] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm leading-6 text-[var(--ms-charcoal)]">
            Current: <span className="font-semibold text-[var(--ms-navy)]">{selectedLanguage.label}</span>. {selectedLanguage.note}
          </p>
        </div>
      </div>
    </section>
  );
}

function getDefaultLanguage() {
  return "en-KE";
}

function getStoredLanguage() {
  if (typeof window === "undefined") {
    return getDefaultLanguage();
  }

  const savedLanguage = window.localStorage.getItem(STORAGE_KEY);

  if (savedLanguage && languageOptions.some((option) => option.value === savedLanguage)) {
    return savedLanguage;
  }

  return getDefaultLanguage();
}

function subscribeToLanguagePreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
}
