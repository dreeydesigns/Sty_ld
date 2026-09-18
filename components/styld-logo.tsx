"use client";

import React from "react";

export type LogoVariant = "auto" | "default" | "reversed" | "dark" | "light" | "mark" | "mark-reversed";

export interface LogoProps {
  className?: string;
  size?: number;
  variant?: LogoVariant;
}

/**
 * Official STYLD S-mark Monogram (Logo Book v2.0)
 * Core identity: Deep Ink #1D1D1B, Clay #C0A090, Sage #909888, White #FFFFFF
 */
export function StyldMark({ size = 32, className = "", variant = "auto" }: LogoProps) {
  const isReversed = variant === "reversed" || variant === "light" || variant === "mark-reversed";
  const isDefault = variant === "default" || variant === "dark" || variant === "mark";

  const ringStroke = isReversed
    ? "rgba(255, 255, 255, 0.22)"
    : isDefault
    ? "#1D1D1B"
    : "var(--header-border, var(--border-default))";

  const circleFill = isReversed
    ? "#20201E"
    : isDefault
    ? "#FFFFFF"
    : "var(--header-bg, var(--bg-surface-raised))";

  const sStroke = isReversed
    ? "#FAF8F5"
    : isDefault
    ? "#1D1D1B"
    : "var(--header-logo-mark, var(--header-text, var(--text-primary)))";

  const sageColor = "#909888";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-colors ${className}`}
      aria-hidden="true"
    >
      {/* Outer framing circle */}
      <circle cx="24" cy="24" r="18" fill={circleFill} stroke={ringStroke} strokeWidth="1.5" />
      {/* Sage accent nodes */}
      <circle cx="20.5" cy="16.5" r="1.75" fill={sageColor} />
      <circle cx="27.5" cy="31.5" r="1.75" fill={sageColor} />
      {/* Monogram S — bolder optical weight so it stays crisp at 16–32px */}
      <path
        d="M18.6 21.4C18.6 18.2 20.8 16.2 24 16.2C27.2 16.2 29.4 18.2 29.4 21.4C29.4 24.6 26.4 25.7 24 25.7C21.6 25.7 18.6 26.8 18.6 30C18.6 33.2 20.8 35.2 24 35.2C27.2 35.2 29.4 33.2 29.4 30"
        stroke={sStroke}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sage vertical rule anchors */}
      <path d="M24 11.4V13.6" stroke={sageColor} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 34.4V36.6" stroke={sageColor} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Official Editorial Wordmark with Clay dot and Sage rule (Logo Book v2.0)
 */
export function StyldWordmark({
  className = "",
  variant = "auto",
  fontSize = "text-2xl",
}: {
  className?: string;
  variant?: LogoVariant;
  fontSize?: string;
}) {
  const isReversed = variant === "reversed" || variant === "light" || variant === "mark-reversed";
  const isDefault = variant === "default" || variant === "dark" || variant === "mark";

  const textColor = isReversed
    ? "text-[#FAF8F5]"
    : isDefault
    ? "text-[#1D1D1B]"
    : "text-[var(--header-logo-text,var(--header-text,var(--text-primary)))]";

  return (
    <span
      className={`inline-flex items-baseline font-display font-bold tracking-tight select-none transition-colors ${fontSize} ${textColor} ${className}`}
    >
      <span>Styld</span>
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-[#C0A090] ml-0.5 mb-1 shrink-0"
        aria-hidden="true"
      />
    </span>
  );
}

/**
 * Full Official Styld Lockup (Mark + Editorial Wordmark)
 */
export function StyldLockup({
  size = 32,
  className = "",
  variant = "auto",
  showMark = true,
  subtitle,
}: LogoProps & { showMark?: boolean; subtitle?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 ${className}`}
      role="img"
      aria-label={subtitle ? `Styld — ${subtitle}` : "Styld"}
    >
      {showMark && <StyldMark size={size} variant={variant} />}
      <div className="flex flex-col justify-center">
        <StyldWordmark
          variant={variant}
          fontSize={size >= 40 ? "text-3xl" : size <= 26 ? "text-xl" : "text-2xl"}
        />
        {subtitle && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C0A090] leading-none mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export default StyldLockup;
