import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/states";

/**
 * Button - canonical interactive control for Styld.
 *
 * Variants: primary | accent | secondary | outline | ghost | destructive | icon
 * Sizes:    sm | md | lg | icon
 *
 * Built entirely from semantic design tokens (action-*, border-*, bg-*,
 * text-*, color-error). Touch targets default to 44px (min-h-11) and the
 * global :focus-visible outline (driven by --focus-ring) is left intact so
 * keyboard focus stays visible. `href` renders a Next.js Link with identical
 * styling; `loading` disables the control and announces busy state.
 *
 * `accent` is the accessible Clay pairing (Ink text on Clay, 6.96:1) used when
 * a warmer secondary emphasis is needed. `primary` (Ink) remains the default.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 disabled:cursor-not-allowed disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] shadow-sm hover:bg-[var(--action-primary-hover)]",
        accent:
          "bg-[var(--action-accent-bg)] text-[var(--action-accent-text)] shadow-sm hover:bg-[var(--action-accent-hover)]",
        secondary:
          "border border-[var(--border-default)] bg-[var(--action-secondary-bg)] text-[var(--action-secondary-text)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-raised)]",
        outline:
          "border-2 border-[var(--action-primary-bg)] bg-transparent text-[var(--action-primary-bg)] hover:bg-[var(--action-primary-bg)] hover:text-[var(--action-primary-text)]",
        ghost:
          "border border-transparent text-[var(--text-primary)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-surface-raised)]",
        destructive:
          "bg-[var(--color-error)] text-[var(--color-white)] shadow-sm hover:opacity-90",
        dark:
          "bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] hover:opacity-90",
        icon:
          "border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-raised)]",
      },
      size: {
        sm: "min-h-11 px-3.5 text-xs",
        md: "min-h-11 px-5 text-sm",
        lg: "min-h-12 px-6 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends ButtonVariantProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: ReactNode;
  href?: string;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  href,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  const content = (
    <>
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </>
  );

  if (href && !disabled && !loading) {
    return (
      <Link className={classes} href={href} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </Link>
    );
  }

  return (
    <button
      aria-busy={loading || undefined}
      className={classes}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {content}
    </button>
  );
}
