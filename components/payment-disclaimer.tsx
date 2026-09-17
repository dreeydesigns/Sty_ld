"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type DisclaimerVariant = "product" | "booking";

interface PaymentDisclaimerProps {
  variant: DisclaimerVariant;
  onAccepted?: (accepted: boolean) => void;
  className?: string;
}

/**
 * Payment disclaimer shown ABOVE the payment CTA on all payment screens.
 * Payment button must be DISABLED until the user actively ticks this checkbox.
 * Pre-ticked = legally invalid under Consumer Protection Act 2012.
 */
export function PaymentDisclaimer({ variant, onAccepted, className }: PaymentDisclaimerProps) {
  const [checked, setChecked] = useState(false);

  function handleToggle() {
    const next = !checked;
    setChecked(next);
    onAccepted?.(next);
  }

  return (
    <div
      className={cn(
        "rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          {variant === "product" ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">
                Important â€” please read before paying
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-secondary)]">
                Styld does not provide delivery services. We are a technology platform that connects buyers and sellers. If this product offers delivery, it is arranged by the seller through an independent delivery partner â€” not by Styld. Styld accepts no liability for delivery timelines, product condition on arrival, or failed deliveries. Any delivery-related disputes are between you and the seller.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">
                Secure Platform Escrow & Booking
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-secondary)]">
                Styld secures your transaction using safe platform escrow. When you book, your payment is held securely by Styld and is only released to the professional or salon once you confirm that the service is completed. Styld operates as the marketplace connection and payment guardian for your absolute peace of mind.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Checkbox â€” must NOT be pre-ticked */}
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-white px-4 py-3 transition hover:border-[var(--color-secondary)]/40">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition",
            checked
              ? "border-[var(--color-secondary)] bg-[var(--color-accent)] text-white"
              : "border-[var(--border-subtle)] bg-white",
          )}
          style={{ minWidth: "1.25rem", minHeight: "1.25rem" }}
        >
          {checked ? (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </span>
        <input
          checked={checked}
          className="sr-only"
          onChange={handleToggle}
          type="checkbox"
        />
        <span className="text-sm leading-6 text-[var(--text-secondary)]">
          I have read and understood the above.
        </span>
      </label>

      <p className="mt-3 text-xs leading-5 text-[var(--color-secondary)]">
        Required by the{" "}
        <Link href="/terms" className="underline hover:text-[var(--text-primary)]">
          Consumer Protection Act, 2012
        </Link>
        . By continuing you confirm you have read our{" "}
        <Link href="/terms" className="underline hover:text-[var(--text-primary)]">
          Terms & Conditions
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * Hook for managing payment disclaimer state.
 * Use the returned `accepted` value to control whether the payment CTA is enabled.
 */
export function usePaymentDisclaimer() {
  const [accepted, setAccepted] = useState(false);
  return { accepted, setAccepted };
}
