"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, MapPin, Minus, Plus, ShoppingBag, Star, Trash2, Truck } from "lucide-react";

import { useCartStore } from "@/lib/cart-store";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { openGuestGate } from "@/lib/guest-session";
import { readAppSession } from "@/lib/client-session";

type Step = 1 | 2 | 3 | 4;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatKes(n: number) {
  return `KES ${n.toLocaleString()}`;
}

// ── Checkout stepper ───────────────────────────────────────────────────────

const STEP_LABELS = ["Review cart", "Delivery", "Pay", "Confirmed"];

function CheckoutStepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const num = (i + 1) as Step;
        const done = num < step;
        const active = num === step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition",
              done ? "bg-emerald-500 text-white"
                : active ? "bg-[var(--ms-rose)] text-white"
                : "bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)]",
            )}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : num}
            </div>
            <span className={cn(
              "hidden text-xs font-medium sm:block",
              active ? "text-[var(--ms-navy)]" : "text-[var(--ms-mauve)]",
            )}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div className={cn("h-px w-6 transition", done ? "bg-emerald-400" : "bg-[var(--ms-border)]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1 — Review cart ───────────────────────────────────────────────────

function StepCart({
  onNext,
}: {
  onNext: () => void;
}) {
  const { items, removeItem, updateQty, total } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-[var(--ms-border)]" />
        <p className="mt-4 text-base font-semibold text-[var(--ms-navy)]">Your cart is empty</p>
        <p className="mt-2 text-sm text-[var(--ms-mauve)]">Add products from Counter to get started.</p>
        <Link
          href="/counter"
          className="mt-6 rounded-full bg-[var(--ms-rose)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Browse Counter
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 rounded-[20px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_2px_8px_rgba(13,27,42,0.04)]"
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[14px] bg-[var(--ms-soft-bg)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ms-navy)]">{item.name}</p>
              <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">{item.brand} · {item.shopName}</p>
              <p className="mt-1 text-sm font-bold text-[var(--ms-navy)]">{formatKes(item.price)}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ms-border)] text-[var(--ms-navy)] hover:border-[var(--ms-rose)]"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-[var(--ms-navy)]">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ms-border)] text-[var(--ms-navy)] hover:border-[var(--ms-rose)]"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="ml-auto text-[var(--ms-mauve)] hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="rounded-[20px] border border-[var(--ms-border)] bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--ms-mauve)]">Subtotal</p>
          <p className="text-sm font-bold text-[var(--ms-navy)]">{formatKes(total())}</p>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-[var(--ms-mauve)]">Delivery</p>
          <p className="text-sm text-[var(--ms-mauve)]">Added at next step</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!readAppSession()) {
            openGuestGate("checkout", "/counter/cart");
            return;
          }
          onNext();
        }}
        className="w-full rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] py-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(200,40,74,0.22)] hover:opacity-90"
      >
        Continue to delivery →
      </button>
    </div>
  );
}

// ── Mock riders ─────────────────────────────────────────────────────────────

const MOCK_RIDERS = [
  { id: "r1", name: "James K.", areas: "Kilimani · Westlands · CBD", rating: 4.9, fee: 200, eta: "30–45 min", available: true, trips: 312 },
  { id: "r2", name: "Brian M.", areas: "South B · Langata · Karen", rating: 4.7, fee: 200, eta: "45–60 min", available: true, trips: 189 },
  { id: "r3", name: "Felix O.", areas: "Eastlands · Umoja · Donholm", rating: 4.8, fee: 200, eta: "20–35 min", available: false, trips: 441 },
  { id: "r4", name: "Peter N.", areas: "Kikuyu · Runda · Rosslyn", rating: 4.6, fee: 200, eta: "40–55 min", available: true, trips: 97 },
];

// ── Step 2 — Delivery ──────────────────────────────────────────────────────

function StepDelivery({ onNext }: { onNext: () => void }) {
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [selectedRider, setSelectedRider] = useState<string | null>(null);

  const availableRiders = MOCK_RIDERS.filter((r) => r.available);
  const canProceed =
    deliveryType === "pickup" ||
    (address.trim().length >= 4 && area.trim().length >= 2 && selectedRider !== null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--ms-navy)]">Delivery details</h2>

      {/* Delivery type */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "delivery" as const, icon: <Truck className="h-4 w-4" />, label: "Deliver to me", sub: "We bring it to your door" },
          { key: "pickup" as const, icon: <MapPin className="h-4 w-4" />, label: "I'll pick up", sub: "Collect from seller's location" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => { setDeliveryType(opt.key); setSelectedRider(null); }}
            className={cn(
              "flex items-start gap-3 rounded-[20px] border p-4 text-left transition",
              deliveryType === opt.key
                ? "border-[var(--ms-rose)] bg-[var(--ms-petal)] text-[var(--ms-plum)]"
                : "border-[var(--ms-border)] bg-white text-[var(--ms-navy)]",
            )}
          >
            <span className="mt-0.5">{opt.icon}</span>
            <div>
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">{opt.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {deliveryType === "delivery" && (
        <>
          {/* Address fields */}
          <div className="space-y-3 rounded-[20px] border border-[var(--ms-border)] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">Your address</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ms-mauve)]">Street / building / road</label>
              <input
                type="text"
                placeholder="Estate name, road, apartment number..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--ms-rose)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ms-mauve)]">Neighbourhood / area</label>
              <input
                type="text"
                placeholder="Kilimani, Westlands, Karen..."
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--ms-rose)]"
              />
            </div>
            <p className="rounded-[12px] bg-[var(--ms-soft-bg)] px-3 py-2 text-[11px] leading-4 text-[var(--ms-mauve)]">
              🔒 Address is only shared with your delivery rider after payment is confirmed.
            </p>
          </div>

          {/* Rider selection */}
          {address.trim().length >= 4 && area.trim().length >= 2 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">
                Choose your rider
              </p>
              <p className="text-xs text-[var(--ms-mauve)]">All deliveries are Ksh 200 · Riders are verified Mobile Salon partners.</p>
              <div className="space-y-2">
                {availableRiders.map((rider) => (
                  <button
                    key={rider.id}
                    type="button"
                    onClick={() => setSelectedRider(rider.id)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-[18px] border p-4 text-left transition",
                      selectedRider === rider.id
                        ? "border-[var(--ms-rose)] bg-[var(--ms-petal)]"
                        : "border-[var(--ms-border)] bg-white hover:border-[var(--ms-rose)]/40",
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                      selectedRider === rider.id ? "bg-[var(--ms-rose)]" : "bg-[var(--ms-plum)]",
                    )}>
                      {rider.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--ms-navy)]">{rider.name}</p>
                        <p className="shrink-0 text-xs font-semibold text-[var(--ms-navy)]">Ksh {rider.fee}</p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-xs text-[var(--ms-mauve)]">
                          <Star className="h-3 w-3 fill-[var(--ms-gold)] text-[var(--ms-gold)]" />
                          {rider.rating}
                        </span>
                        <span className="text-[var(--ms-border)]">·</span>
                        <span className="text-xs text-[var(--ms-mauve)]">{rider.trips} deliveries</span>
                        <span className="text-[var(--ms-border)]">·</span>
                        <span className="text-xs text-emerald-600">{rider.eta}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--ms-mauve)]">
                        <MapPin className="mr-0.5 inline h-2.5 w-2.5" />{rider.areas}
                      </p>
                    </div>
                    {selectedRider === rider.id && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--ms-rose)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {deliveryType === "pickup" && (
        <div className="rounded-[20px] border border-[var(--ms-border)] bg-white p-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ms-plum)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--ms-navy)]">Pickup location confirmed after payment</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">
                The seller will send you their exact address via WhatsApp once payment is held in escrow.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!canProceed}
        className="w-full rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] py-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(200,40,74,0.22)] hover:opacity-90 disabled:opacity-50"
      >
        {deliveryType === "delivery" && !selectedRider && address.trim().length >= 4
          ? "Select a rider to continue →"
          : "Continue to payment →"}
      </button>
    </div>
  );
}

// ── Step 3 — Pay ───────────────────────────────────────────────────────────

function StepPay({ onNext }: { onNext: () => void }) {
  const { items, total } = useCartStore();
  const [method, setMethod] = useState<"mpesa" | "card">("mpesa");
  const [confirmed, setConfirmed] = useState(false);
  const [phone, setPhone] = useState("");

  const commission = Math.round(total() * 0.05);
  const delivery = 200;
  const grandTotal = total() + delivery;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--ms-navy)]">Pay securely</h2>

      {/* Order summary */}
      <div className="rounded-[20px] border border-[var(--ms-border)] bg-white p-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="truncate text-[var(--ms-mauve)]">{item.name} ×{item.quantity}</span>
            <span className="font-medium text-[var(--ms-navy)]">{formatKes(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-[var(--ms-border)] pt-2 text-sm">
          <span className="text-[var(--ms-mauve)]">Delivery</span>
          <span className="text-[var(--ms-navy)]">{formatKes(delivery)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span className="text-[var(--ms-navy)]">Total</span>
          <span className="text-[var(--ms-navy)]">{formatKes(grandTotal)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "mpesa" as const, label: "M-Pesa", sub: "Lipa na M-Pesa" },
          { key: "card" as const, label: "💳 Card", sub: "Debit or credit" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setMethod(opt.key)}
            className={cn(
              "rounded-[20px] border p-4 text-left transition",
              method === opt.key
                ? "border-[var(--ms-rose)] bg-[var(--ms-petal)]"
                : "border-[var(--ms-border)] bg-white",
            )}
          >
            <p className="text-sm font-semibold text-[var(--ms-navy)]">{opt.label}</p>
            <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">{opt.sub}</p>
          </button>
        ))}
      </div>

      {method === "mpesa" && (
        <div className="rounded-[20px] border border-[var(--ms-border)] bg-white p-4">
          <label className="mb-1 block text-xs font-semibold text-[var(--ms-mauve)]">M-Pesa number</label>
          <input
            type="tel"
            placeholder="+254 7XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--ms-rose)]"
          />
          <p className="mt-2 text-xs text-[var(--ms-mauve)]">You will receive a push notification to authorise payment.</p>
        </div>
      )}

      {/* Disclaimer — NEVER pre-ticked */}
      <label className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-[var(--ms-border)] bg-white p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--ms-rose)]"
        />
        <span className="text-xs leading-5 text-[var(--ms-mauve)]">
          I confirm this order and understand that payment is held in escrow until the seller dispatches and I confirm receipt. All transactions go through the Mobile Salon platform — no cash payments.
        </span>
      </label>

      <button
        type="button"
        onClick={onNext}
        disabled={!confirmed}
        className="w-full rounded-full bg-[linear-gradient(135deg,var(--ms-rose),var(--ms-orchid))] py-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(200,40,74,0.22)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Pay {formatKes(grandTotal)}
      </button>
      <p className="text-center text-xs text-[var(--ms-mauve)]">
        Seller receives your order details only after payment is confirmed.
      </p>
    </div>
  );
}

// ── Step 4 — Confirmed ─────────────────────────────────────────────────────

function StepConfirmed() {
  const { clear } = useCartStore();

  const ref = `MS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-[var(--ms-navy)]">Order confirmed</h2>
      <p className="mt-2 text-sm text-[var(--ms-mauve)]">Your payment is secure. We will notify you when your order ships.</p>

      <div className="mt-6 w-full rounded-[20px] border border-[var(--ms-border)] bg-white p-5 text-left">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--ms-mauve)]">Order reference</p>
          <p className="font-mono text-sm font-bold text-[var(--ms-navy)]">{ref}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-[var(--ms-mauve)]">Estimated delivery</p>
          <p className="text-sm text-[var(--ms-navy)]">2–4 business days</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-[var(--ms-mauve)]">Payment status</p>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Held in escrow</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-[var(--ms-mauve)]">
        Once you confirm receipt, payment is released to the seller.
      </p>

      <div className="mt-6 flex gap-3">
        <Link
          href="/counter"
          onClick={clear}
          className="rounded-full border border-[var(--ms-border)] px-6 py-3 text-sm font-semibold text-[var(--ms-navy)] hover:border-[var(--ms-rose)]"
        >
          Keep shopping
        </Link>
        <Link
          href="/profile"
          className="rounded-full bg-[var(--ms-plum)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          My orders
        </Link>
      </div>
    </div>
  );
}

// ── Cart / Checkout page ───────────────────────────────────────────────────

export default function CartPage() {
  const [step, setStep] = useState<Step>(1);
  const { count } = useCartStore();

  return (
    <AppShell currentNav="counter">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/counter" className="rounded-full border border-[var(--ms-border)] p-2 text-[var(--ms-mauve)] hover:border-[var(--ms-rose)]">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-[var(--ms-navy)]">
              {step < 4 ? "Checkout" : "Order confirmed"}
            </h1>
            {step < 4 && count() > 0 && (
              <p className="text-xs text-[var(--ms-mauve)]">{count()} item{count() !== 1 ? "s" : ""} in cart</p>
            )}
          </div>
        </div>

        {/* Stepper */}
        {step < 4 && (
          <div className="mb-6">
            <CheckoutStepper step={step} />
          </div>
        )}

        {/* Step content */}
        {step === 1 && <StepCart onNext={() => setStep(2)} />}
        {step === 2 && <StepDelivery onNext={() => setStep(3)} />}
        {step === 3 && <StepPay onNext={() => setStep(4)} />}
        {step === 4 && <StepConfirmed />}
      </div>
    </AppShell>
  );
}
