"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  Shield,
  Truck,
  Upload,
  Wallet,
} from "lucide-react";

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  "Welcome",
  "Personal details",
  "Verification",
  "Coverage zone",
  "Payout setup",
  "Done",
];

// ─── Nairobi sub-areas (coverage zone multi-select) ───────────────────────────

const NAIROBI_ZONES = [
  "CBD", "Westlands", "Karen", "Kilimani", "Lavington",
  "Langata", "South B", "South C", "Eastlands", "Embakasi",
  "Kasarani", "Ruaka", "Kiambu Road", "Ngong Road", "Githurai",
];

// ─── Delivery Onboarding Flow ─────────────────────────────────────────────────

export function DeliveryOnboardingFlow() {
  const [step, setStep] = useState(0);

  // Step 1 — personal details
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicleType, setVehicleType] = useState<"bicycle" | "motorcycle" | "car" | "">("");

  // Step 2 — verification
  const [nationalId, setNationalId] = useState("");
  const [idFrontUploaded, setIdFrontUploaded] = useState(false);
  const [idBackUploaded, setIdBackUploaded] = useState(false);
  const [licenseUploaded, setLicenseUploaded] = useState(false);

  // Step 3 — coverage zone
  const [selectedZones, setSelectedZones] = useState<string[]>([]);

  // Step 4 — payout
  const [mpesaNumber, setMpesaNumber] = useState("");
  const [mpesaName, setMpesaName] = useState("");

  function canAdvance() {
    if (step === 0) return true;
    if (step === 1)
      return fullName.trim().length > 2 && phone.trim().length >= 10 && vehicleType !== "";
    if (step === 2) return nationalId.trim().length >= 7 && idFrontUploaded && idBackUploaded;
    if (step === 3) return selectedZones.length > 0;
    if (step === 4) return mpesaNumber.trim().length >= 10 && mpesaName.trim().length > 2;
    return true;
  }

  function toggleZone(zone: string) {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone],
    );
  }

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ms-soft-bg)] px-4 py-10">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#EA580C] text-white shadow-[0_12px_30px_rgba(234,88,12,0.35)]">
            <Truck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-[var(--ms-navy)]">
            Become a Delivery Partner
          </h1>
          <p className="mt-1 text-sm text-[var(--ms-mauve)]">
            Deliver beauty products across Nairobi. Earn per delivery.
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ms-border)]">
            <div
              className="h-full rounded-full bg-[#EA580C] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-[28px] border border-[var(--ms-border)] bg-white p-6 shadow-[0_12px_40px_rgba(13,27,42,0.08)]">

          {/* ── Step 0: Welcome ─────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#EA580C]">
                  Rider account
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--ms-navy)]">
                  How it works
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  { title: "Partner with Shop+ sellers", body: "Pick up beauty products from verified Counter sellers across Nairobi." },
                  { title: "Earn per delivery", body: "Transparent per-trip pay. No hidden deductions. Paid via M-Pesa." },
                  { title: "Set your zones", body: "Choose which Nairobi neighbourhoods you operate in. Update anytime." },
                  { title: "Separate login", body: "Your rider account is independent from any Client or Professional account you may hold." },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-[16px] border border-[var(--ms-border)] px-4 py-3"
                  >
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--ms-navy)]">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-[var(--ms-mauve)]">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Personal details ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--ms-navy)]">Personal details</h2>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[var(--ms-mauve)]">Full name</span>
                <input
                  className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2.5 text-sm text-[var(--ms-navy)] outline-none focus:border-[#EA580C]"
                  placeholder="As on your national ID"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[var(--ms-mauve)]">Phone number</span>
                <input
                  className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2.5 text-sm text-[var(--ms-navy)] outline-none focus:border-[#EA580C]"
                  placeholder="+254 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[var(--ms-mauve)]">Email address (optional)</span>
                <input
                  className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2.5 text-sm text-[var(--ms-navy)] outline-none focus:border-[#EA580C]"
                  placeholder="rider@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[var(--ms-mauve)]">Vehicle type</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["bicycle", "motorcycle", "car"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVehicleType(v)}
                      className="rounded-[14px] border px-4 py-2.5 text-sm font-semibold capitalize transition"
                      style={
                        vehicleType === v
                          ? { borderColor: "#EA580C", backgroundColor: "rgba(234,88,12,0.08)", color: "#EA580C" }
                          : { borderColor: "var(--ms-border)", color: "var(--ms-mauve)" }
                      }
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Verification ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ms-navy)]">Verification</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">
                  Required under Kenya's Transport Licensing regulations. Your documents are encrypted and never shared with buyers.
                </p>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[var(--ms-mauve)]">National ID number</span>
                <input
                  className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2.5 text-sm text-[var(--ms-navy)] outline-none focus:border-[#EA580C]"
                  placeholder="e.g. 12345678"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                />
              </label>

              {/* Upload buttons */}
              {[
                { label: "National ID — front", uploaded: idFrontUploaded, setUploaded: setIdFrontUploaded },
                { label: "National ID — back", uploaded: idBackUploaded, setUploaded: setIdBackUploaded },
                { label: "Driving licence / PSV badge (optional)", uploaded: licenseUploaded, setUploaded: setLicenseUploaded },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <span className="text-xs font-semibold text-[var(--ms-mauve)]">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => item.setUploaded(!item.uploaded)}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed py-4 text-sm font-semibold transition"
                    style={
                      item.uploaded
                        ? { borderColor: "#1A7A6B", color: "#1A7A6B", backgroundColor: "rgba(26,122,107,0.06)" }
                        : { borderColor: "var(--ms-border)", color: "var(--ms-mauve)" }
                    }
                  >
                    {item.uploaded ? (
                      <><CheckCircle2 className="h-4 w-4" /> Uploaded</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Upload file</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 3: Coverage zone ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ms-navy)]">Coverage zone</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">
                  Select all Nairobi areas you are willing to deliver in. You can update this anytime from your dashboard.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {NAIROBI_ZONES.map((zone) => {
                  const selected = selectedZones.includes(zone);
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => toggleZone(zone)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                      style={
                        selected
                          ? { borderColor: "#EA580C", backgroundColor: "rgba(234,88,12,0.10)", color: "#EA580C" }
                          : { borderColor: "var(--ms-border)", color: "var(--ms-mauve)" }
                      }
                    >
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {zone}
                    </button>
                  );
                })}
              </div>

              {selectedZones.length > 0 && (
                <p className="text-xs font-semibold text-[#EA580C]">
                  {selectedZones.length} zone{selectedZones.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          {/* ── Step 4: Payout setup ─────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ms-navy)]">Payout setup</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">
                  Earnings are paid directly to M-Pesa after each delivery is confirmed. No deductions beyond platform commission.
                </p>
              </div>

              <div className="rounded-[16px] bg-[rgba(234,88,12,0.07)] p-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#EA580C]" />
                  <p className="text-xs font-semibold text-[var(--ms-navy)]">M-Pesa payout</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">
                  Payments are released once the buyer confirms delivery. Funds arrive within 24 hours.
                </p>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[var(--ms-mauve)]">M-Pesa number</span>
                <input
                  className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2.5 text-sm text-[var(--ms-navy)] outline-none focus:border-[#EA580C]"
                  placeholder="+254 7XX XXX XXX"
                  value={mpesaNumber}
                  onChange={(e) => setMpesaNumber(e.target.value)}
                  type="tel"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[var(--ms-mauve)]">M-Pesa registered name</span>
                <input
                  className="w-full rounded-[14px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-2.5 text-sm text-[var(--ms-navy)] outline-none focus:border-[#EA580C]"
                  placeholder="Name as registered with Safaricom"
                  value={mpesaName}
                  onChange={(e) => setMpesaName(e.target.value)}
                />
              </label>

              <div className="rounded-[14px] border border-[var(--ms-border)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0 text-[var(--ms-rose)]" />
                  <p className="text-xs font-semibold text-[var(--ms-navy)]">Security notice</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--ms-mauve)]">
                  Mobile Salon will never ask you to share your M-Pesa PIN. Payouts are automated and PIN-free.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 5: Done ─────────────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-5 text-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(26,122,107,0.12)] text-[#1A7A6B]">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-[var(--ms-navy)]">Application submitted!</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">
                  Your rider application is under review. We typically approve within 24–48 hours. You will receive an SMS on{" "}
                  <span className="font-semibold text-[var(--ms-navy)]">{phone || "your number"}</span> once approved.
                </p>
              </div>

              <div className="rounded-[18px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">
                  What happens next
                </p>
                <ul className="mt-3 space-y-2">
                  {[
                    "Our team verifies your ID documents (24–48 hrs)",
                    "You receive an SMS with your activation link",
                    "Log in to your rider dashboard and go live",
                    "Accept delivery requests in your selected zones",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-5 text-[var(--ms-charcoal)]">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#EA580C] text-[9px] font-bold text-white">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className={`mt-6 flex gap-3 ${step > 0 && step < STEPS.length - 1 ? "justify-between" : "justify-end"}`}>
            {step > 0 && step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ms-border)] px-5 py-2.5 text-sm font-semibold text-[var(--ms-mauve)] transition hover:border-[#EA580C] hover:text-[#EA580C]"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button
                type="button"
                disabled={!canAdvance()}
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: "#EA580C" }}
              >
                {step === STEPS.length - 2 ? "Submit application" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {step === STEPS.length - 1 && (
              <a
                href="/dashboard/delivery"
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ backgroundColor: "#EA580C" }}
              >
                Go to rider dashboard
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* Legal notice */}
        <p className="text-center text-[11px] leading-5 text-[var(--ms-mauve)]">
          By applying you agree to Mobile Salon's{" "}
          <a href="/terms" className="font-semibold underline underline-offset-2" style={{ color: "#EA580C" }}>
            Terms & Conditions
          </a>{" "}
          and the Rider Partner Agreement. You must be 18+ and legally permitted to work in Kenya.
        </p>
      </div>
    </main>
  );
}
