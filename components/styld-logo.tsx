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
      <circle cx="21" cy="16.5" r="1.5" fill={sageColor} />
      <circle cx="27" cy="31.5" r="1.5" fill={sageColor} />
      {/* Monogram S with balanced curves */}
      <path
        d="M19 21.5C19 18.5 21 16.5 24 16.5C27 16.5 29 18.5 29 21.5C29 24.5 26 25.5 24 25.5C22 25.5 19 26.5 19 29.5C19 32.5 21 34.5 24 34.5C27 34.5 29 32.5 29 29.5"
        stroke={sStroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sage vertical rule anchors */}
      <path d="M24 12V14" stroke={sageColor} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 34V36" stroke={sageColor} strokeWidth="2" strokeLinecap="round" />
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
