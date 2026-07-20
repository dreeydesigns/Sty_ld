"use client";

/**
 * components/phone-input.tsx
 *
 * Drop-in phone input that:
 *  - Shows a clickable flag + country code badge
 *  - Correctly handles auto-fill / paste of full international numbers
 *  - Never double-prefixes the country code
 *  - Calls onChange with the full E.164 number (+254743817931)
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COUNTRY_CODES, parsePhoneNumber, type CountryConfig } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  /** E.164 value controlled by the parent (e.g. "+254743817931" or "" on init) */
  value: string;
  /** Called with the full E.164 number every time the number changes */
  onChange: (e164: string) => void;
  label?: string;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  label = "Phone",
  className,
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryConfig>(
    COUNTRY_CODES.find((c) => c.code === "254")!,
  );
  const [local, setLocal] = useState("");
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Initialise local state from the E.164 value on mount
  useEffect(() => {
    if (!value) return;
    const parsed = parsePhoneNumber(value);
    setCountry(parsed.country);
    setLocal(parsed.localNumber.slice(0, parsed.country.digits));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once

  // Close dropdown when clicking outside
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function emit(c: CountryConfig, digits: string) {
    onChange(`+${c.code}${digits}`);
  }

  function handleChange(raw: string) {
    // Auto-fill / paste detection: raw contains + or is longer than the max local length
    const looksLikeFull =
      raw.includes("+") || raw.replace(/\D/g, "").length > country.digits + 1;

    if (looksLikeFull) {
      const parsed = parsePhoneNumber(raw);
      const digits = parsed.localNumber.slice(0, parsed.country.digits);
      setCountry(parsed.country);
      setLocal(digits);
      emit(parsed.country, digits);
      return;
    }

    // Normal typed input — strip non-digits and cap at country.digits
    const digits = raw.replace(/\D/g, "").slice(0, country.digits);
    setLocal(digits);
    emit(country, digits);
  }

  function selectCountry(c: CountryConfig) {
    setCountry(c);
    setOpen(false);
    const digits = local.slice(0, c.digits);
    setLocal(digits);
    emit(c, digits);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const isValid = local.length === country.digits;

  return (
    <label
      className={cn(
        "block rounded-[24px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-4",
        className,
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ms-mauve)]">
        {label}
      </span>

      <div className="relative mt-3" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          {/* Country selector */}
          <button
            type="button"
            aria-label="Select country code"
            onClick={() => setOpen((o) => !o)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-semibold text-[var(--ms-navy)] transition hover:brightness-95"
          >
            <span>{country.flag}</span>
            <span>+{country.code}</span>
            <ChevronDown
              className={cn(
                "ml-0.5 h-3.5 w-3.5 text-[var(--ms-mauve)] transition-transform duration-150",
                open && "rotate-180",
              )}
            />
          </button>

          {/* Local number field */}
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            name="phone"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[var(--ms-navy)] outline-none placeholder:font-normal placeholder:text-[var(--ms-mauve)]/60"
            placeholder={country.code === "254" ? "712 345 678" : "Local number"}
            value={local}
            maxLength={country.digits + 1} // small buffer for formatting chars
            onChange={(e) => handleChange(e.target.value)}
          />
        </div>

        {/* Country picker dropdown */}
        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[18px] border border-[var(--ms-border)] bg-white shadow-xl">
            <div className="max-h-56 overflow-y-auto py-1">
              {COUNTRY_CODES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--ms-soft-bg)]",
                    country.code === c.code &&
                      "bg-[var(--ms-soft-bg)] font-semibold",
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 text-[var(--ms-navy)]">{c.name}</span>
                  <span className="text-xs text-[var(--ms-mauve)]">+{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inline validation */}
      {local.length > 0 && !isValid && (
        <p className="mt-2 text-xs font-semibold text-[var(--ms-danger)]">
          {country.name} numbers are {country.digits} digits. You&apos;ve entered{" "}
          {local.length}.
        </p>
      )}
    </label>
  );
}
