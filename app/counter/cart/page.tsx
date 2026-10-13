"use client";

import Link from "next/link";
import { ChevronLeft, Info, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { useCartStore } from "@/lib/cart-store";
import { AppShell } from "@/components/app-shell";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatKes(n: number) {
  return `KES ${n.toLocaleString()}`;
}

// ── Cart page ──────────────────────────────────────────────────────────────
// Counter ordering is not live yet. The cart is kept for reference only:
// there is no checkout, payment, delivery or order confirmation.

export default function CartPage() {
  const { items, removeItem, updateQty, total, count } = useCartStore();

  return (
    <AppShell currentNav="counter">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/counter" className="rounded-full border border-[var(--border-subtle)] p-2 text-[var(--color-secondary)] hover:border-[var(--color-warning)]">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Cart</h1>
            {count() > 0 && (
              <p className="text-xs text-[var(--color-secondary)]">{count()} item{count() !== 1 ? "s" : ""} in cart</p>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-[var(--color-border)]" />
            <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">Your cart is empty</p>
            <p className="mt-2 text-sm text-[var(--color-secondary)]">Add products from Counter to get started.</p>
            <Link
              href="/counter"
              className="mt-6 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Browse Counter
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[0_2px_8px_rgba(13,27,42,0.04)]"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[14px] bg-[var(--surface-card)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-secondary)]">{item.brand} · {item.shopName}</p>
                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">{formatKes(item.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--color-warning)]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-[var(--text-primary)]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--color-warning)]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="ml-auto text-[var(--color-secondary)] hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-secondary)]">Subtotal</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{formatKes(total())}</p>
              </div>
            </div>

            {/* Ordering unavailable */}
            <div className="flex items-start gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-secondary)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Ordering coming soon</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-secondary)]">
                  Counter checkout is not live yet. You can keep items here for reference, but orders,
                  payment and delivery are not available.
                </p>
              </div>
            </div>

            <Link
              href="/counter"
              className="block w-full rounded-full border border-[var(--border-subtle)] py-4 text-center text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--color-warning)]"
            >
              Keep browsing
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
