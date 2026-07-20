"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  ShoppingBag,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Subscription tiers ───────────────────────────────────────────────────────

const SUBSCRIPTION_TIERS = [
  {
    id: "basic",
    name: "Shop Basic",
    price: "KES 1,500 / month",
    priceKES: 1500,
    features: ["Up to 50 listings", "Standard Counter placement", "No promoted slots", "5% commission per sale"],
    highlight: false,
  },
  {
    id: "growth",
    name: "Shop Growth",
    price: "KES 3,500 / month",
    priceKES: 3500,
    features: ["Unlimited listings", "1 promoted slot/month", "Analytics dashboard", "Priority search placement", "5% commission per sale"],
    highlight: true,
    badge: "Most popular",
  },
  {
    id: "plus",
    name: "Shop+",
    price: "KES 6,000 / month",
    priceKES: 6000,
    features: [
      "Everything in Growth",
      "Delivery integration",
      "3 promoted slots/month",
      "Counter homepage feature",
      "5% commission per sale",
    ],
    highlight: false,
    badge: "Full access",
  },
] as const;

type TierId = (typeof SUBSCRIPTION_TIERS)[number]["id"];

// ─── Business type options ─────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  "Registered company",
  "Sole trader / Individual business",
  "Individual brand",
  "Beauty distributor / Wholesaler",
] as const;

// ─── Main component ────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

export function ShopOnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 — Role selection (already done by coming here)
  // Step 2 — Business details
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState<string>("");

  // Step 3 — Verification
  const [kraPin, setKraPin] = useState("");
  const [businessReg, setBusinessReg] = useState("");

  // Step 4 — Subscription
  const [selectedTier, setSelectedTier] = useState<TierId>("growth");

  // Step 5 — Shop setup
  const [about, setAbout] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");

  const totalSteps = 5;

  function canAdvance() {
    if (step === 2) return Boolean(shopName && ownerName && email && phone && businessType);
    if (step === 3) return Boolean(kraPin);
    if (step === 4) return Boolean(selectedTier);
    if (step === 5) return Boolean(mpesaNumber);
    return true;
  }

  function advance() {
    if (step < totalSteps) {
      setStep((s) => (s + 1) as Step);
    } else {
      router.push("/dashboard/shop");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-8 text-[var(--ms-charcoal)]">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-lg content-center">
        <div className="overflow-hidden rounded-[38px] border border-[var(--ms-border)] bg-white shadow-[0_24px_80px_rgba(13,27,42,0.1)]">

          {/* Header */}
          <div className="bg-[#8B5CF6] p-7 text-white">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white">
                <ShoppingBag className="h-6 w-6" />
              </span>
              {step > 1 && (
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white"
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-500"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/58">
              Step {step} of {totalSteps}
            </p>

            <h1 className="mt-4 font-display text-3xl leading-tight">
              {step === 1 && "Let's get your shop live."}
              {step === 2 && "Tell us about your business."}
              {step === 3 && "Verify your identity."}
              {step === 4 && "Choose your plan."}
              {step === 5 && "Set up your shop."}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {step === 1 && "Only Shop accounts can list and sell on Counter. This is a separate account from Client, Salon, and Professional."}
              {step === 2 && "Four fields only. You can add more detail once your shop is live."}
              {step === 3 && "Required to protect buyers. Your KRA PIN creates a traceable record."}
              {step === 4 && "A paid subscription is required to go live on Counter. Cancel anytime."}
              {step === 5 && "Last step. Set your shop up and start listing products."}
            </p>
          </div>

          {/* Step content */}
          <div className="space-y-4 p-6">

            {/* Step 1 — Confirm role */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-[22px] border border-[#8B5CF6]/30 bg-[#8B5CF6]/8 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8B5CF6]">
                    Seller account
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ms-charcoal)]">
                    You are registering as a <strong>Shop</strong> — a seller account. This is entirely separate from a Client, Salon, or Professional account.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {[
                      "List beauty products on Counter",
                      "Receive orders and manage fulfilment",
                      "Get paid via M-Pesa after delivery confirmed",
                      "5% commission only when you sell",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-[var(--ms-charcoal)]">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#8B5CF6]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[18px] bg-[var(--ms-soft-bg)] px-4 py-3 text-xs leading-5 text-[var(--ms-mauve)]">
                  <strong className="text-[var(--ms-navy)]">Want to buy from Counter?</strong>{" "}
                  {"You'll need a separate "}
                  <Link href="/signup/client" className="text-[var(--ms-rose)] underline">
                    Client account
                  </Link>
                  . One email can hold both.
                </div>
              </div>
            )}

            {/* Step 2 — Business details */}
            {step === 2 && (
              <div className="space-y-3">
                <InputField
                  label="Shop name"
                  value={shopName}
                  onChange={setShopName}
                  placeholder="e.g. Beauty Base KE"
                />
                <InputField
                  label="Owner / manager name"
                  value={ownerName}
                  onChange={setOwnerName}
                  placeholder="Full name"
                />
                <InputField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="shop@email.com"
                />
                <InputField
                  label="Phone number"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="07XX XXX XXX"
                />
                <div className="rounded-[18px] border border-[var(--ms-border)] bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Business type</p>
                  <div className="mt-3 grid gap-2">
                    {BUSINESS_TYPES.map((type) => (
                      <button
                        className={cn(
                          "rounded-[14px] border px-4 py-3 text-left text-sm font-medium transition",
                          businessType === type
                            ? "border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]"
                            : "border-[var(--ms-border)] text-[var(--ms-charcoal)] hover:border-[#8B5CF6]/40",
                        )}
                        key={type}
                        onClick={() => setBusinessType(type)}
                        type="button"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Verification */}
            {step === 3 && (
              <div className="space-y-3">
                <InputField
                  label="KRA PIN number"
                  value={kraPin}
                  onChange={setKraPin}
                  placeholder="A000000000X"
                  hint="Required for all Shop accounts. Creates a traceable record."
                />
                <InputField
                  label="Business registration number (optional)"
                  value={businessReg}
                  onChange={setBusinessReg}
                  placeholder="e.g. CPR/2024/XXXXXX"
                  hint="Optional for individuals. Required for registered companies."
                />
                <div className="rounded-[18px] border border-dashed border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--ms-mauve)]">
                      <Upload className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--ms-navy)]">Upload National ID (optional)</p>
                      <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">Front and back. Speeds up verification.</p>
                    </div>
                  </div>
                </div>
                <p className="rounded-[14px] bg-[var(--ms-soft-bg)] px-4 py-3 text-xs leading-5 text-[var(--ms-mauve)]">
                  Your verification documents are reviewed by Styld admin within 24 hours. Your shop goes live after approval.
                </p>
              </div>
            )}

            {/* Step 4 — Subscription */}
            {step === 4 && (
              <div className="space-y-3">
                {SUBSCRIPTION_TIERS.map((tier) => (
                  <button
                    className={cn(
                      "w-full rounded-[22px] border p-5 text-left transition",
                      selectedTier === tier.id
                        ? "border-[#8B5CF6] bg-[#8B5CF6]/8"
                        : "border-[var(--ms-border)] bg-white hover:border-[#8B5CF6]/40",
                    )}
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--ms-navy)]">{tier.name}</p>
                          {"badge" in tier && (
                            <span className="rounded-full bg-[#8B5CF6] px-2 py-0.5 text-[10px] font-semibold text-white">
                              {tier.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-[#8B5CF6]">{tier.price}</p>
                      </div>
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                          selectedTier === tier.id ? "border-[#8B5CF6] bg-[#8B5CF6]" : "border-[var(--ms-border)]",
                        )}
                      >
                        {selectedTier === tier.id && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-xs text-[var(--ms-mauve)]">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#8B5CF6]" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
                <p className="text-center text-xs text-[var(--ms-mauve)]">
                  Commission is <strong>5% on all plans</strong>. Deducted from seller payout only.
                </p>
              </div>
            )}

            {/* Step 5 — Shop setup */}
            {step === 5 && (
              <div className="space-y-3">
                <div className="rounded-[18px] border border-dashed border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--ms-mauve)]">
                      <Upload className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--ms-navy)]">Shop logo (optional)</p>
                      <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">Square, min 400×400px. Skippable.</p>
                    </div>
                  </div>
                </div>

                <label className="block rounded-[18px] border border-[var(--ms-border)] bg-white px-4 py-4">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">About your shop (max 140 chars)</span>
                  <textarea
                    className="mt-3 w-full resize-none bg-transparent text-sm text-[var(--ms-charcoal)] outline-none"
                    maxLength={140}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Genuine beauty products delivered across Nairobi..."
                    rows={3}
                    value={about}
                  />
                  <p className="mt-1 text-right text-xs text-[var(--ms-mauve)]">{about.length}/140</p>
                </label>

                <InputField
                  label="M-Pesa payout number"
                  type="tel"
                  value={mpesaNumber}
                  onChange={setMpesaNumber}
                  placeholder="07XX XXX XXX"
                  hint="Payouts are sent here after buyers confirm receipt."
                />

                <p className="rounded-[14px] bg-[var(--ms-soft-bg)] px-4 py-3 text-xs leading-5 text-[var(--ms-mauve)]">
                  You can add a banner, product categories, and your first listings from your Shop dashboard.
                </p>
              </div>
            )}

            {/* CTA */}
            <button
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canAdvance()}
              onClick={advance}
              style={{ backgroundColor: "#8B5CF6" }}
              type="button"
            >
              {step === totalSteps ? (
                <>
                  Go to my shop dashboard
                  <ShoppingBag className="h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {step === 1 && (
              <Link
                href="/auth/sign-up"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--ms-border)] text-sm font-semibold text-[var(--ms-mauve)] transition hover:border-[#8B5CF6] hover:text-[var(--ms-navy)]"
              >
                ← Back to role selection
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Field atoms ───────────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block rounded-[18px] border border-[var(--ms-border)] bg-white px-4 py-4">
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">{label}</span>
      <input
        className="mt-3 w-full bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {hint && <p className="mt-2 text-xs leading-5 text-[var(--ms-mauve)]">{hint}</p>}
    </label>
  );
}
