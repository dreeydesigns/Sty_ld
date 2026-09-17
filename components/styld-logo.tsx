"use client";

import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  variant?: "auto" | "dark" | "light"; // auto = theme-adaptive (default), dark = Deep Ink on light surfaces, light = White on dark surfaces
}

/**
 * Official STYLD S-mark Monogram (Logo Book v2.0)
 * Core identity: Deep Ink #1D1D1B, Clay #C0A090, Sage #909888, White #FFFFFF
 */
export function StyldMark({ size = 32, className = "", variant = "auto" }: LogoProps) {
  const isLight = variant === "light";
  const isDark = variant === "dark";
  
  const ringStroke = isLight ? "#FFFFFF" : isDark ? "#1D1D1B" : "var(--border-default)";
  const circleFill = isLight ? "#1D1D1B" : isDark ? "#FFFFFF" : "var(--bg-surface-raised)";
  const sStroke = isLight ? "#FFFFFF" : isDark ? "#1D1D1B" : "var(--text-primary)";
  const sageColor = "#909888";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Styld"
    >
      {/* Outer circle */}
      <circle cx="24" cy="24" r="18" fill={circleFill} stroke={ringStroke} strokeWidth="1.5" />
      {/* Sage accent nodes */}
      <circle cx="21" cy="17" r="1.5" fill={sageColor} />
      <circle cx="27" cy="31" r="1.5" fill={sageColor} />
      {/* Monogram S */}
      <path
        d="M19 21.5C19 18.5 21 16.5 24 16.5C27 16.5 29 18.5 29 21.5C29 24.5 26 25.5 24 25.5C22 25.5 19 26.5 19 29.5C19 32.5 21 34.5 24 34.5C27 34.5 29 32.5 29 29.5"
        stroke={sStroke}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sage rule anchors */}
      <path d="M24 13V15" stroke={sageColor} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 33V35" stroke={sageColor} strokeWidth="2" strokeLinecap="round" />
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
  variant?: "auto" | "dark" | "light";
  fontSize?: string;
}) {
  const isLight = variant === "light";
  const isDark = variant === "dark";
  const textColor = isLight ? "text-[#FFFFFF]" : isDark ? "text-[#1D1D1B]" : "text-[var(--text-primary)]";

  return (
    <span className={`inline-flex items-baseline font-display font-bold tracking-tight ${fontSize} ${textColor} ${className}`}>
      <span>Styld</span>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C0A090] ml-0.5 mb-1" aria-hidden="true" />
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
}: LogoProps & { showMark?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {showMark && <StyldMark size={size} variant={variant} />}
      <StyldWordmark variant={variant} fontSize={size >= 40 ? "text-3xl" : "text-2xl"} />
    </div>
  );
}

export default StyldLockup;
