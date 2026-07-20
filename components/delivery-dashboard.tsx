"use client";

import {
  Bell,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  Truck,
  TrendingUp,
  WalletCards,
  XCircle,
} from "lucide-react";

// ─── Mock data ─────────────────────────────────────────────────────────────────

const STATS = [
  { label: "Deliveries today", value: "4", icon: <Truck className="h-5 w-5" />, color: "#EA580C" },
  { label: "This month", value: "67", icon: <Package className="h-5 w-5" />, color: "#8B5CF6" },
  { label: "Earnings today", value: "KES 1,840", icon: <WalletCards className="h-5 w-5" />, color: "#BF8C2E" },
  { label: "Rider rating", value: "4.9 ✦", icon: <Star className="h-5 w-5" />, color: "#1A7A6B" },
];

const MOCK_DELIVERIES = [
  {
    id: "DEL-041",
    product: "Vitamin C Glow Serum",
    shop: "Beauty Base KE",
    pickup: "Westlands",
    dropoff: "Kilimani",
    status: "Pending pickup",
    pay: "KES 320",
    time: "3 min ago",
  },
  {
    id: "DEL-040",
    product: "Edge Control Gel",
    shop: "GlowHaven",
    pickup: "Karen",
    dropoff: "Langata",
    status: "In transit",
    pay: "KES 420",
    time: "45 min ago",
  },
  {
    id: "DEL-039",
    product: "Matte Lip Kit",
    shop: "Beauty Base KE",
    pickup: "CBD",
    dropoff: "South B",
    status: "Delivered",
    pay: "KES 280",
    time: "2 hrs ago",
  },
  {
    id: "DEL-038",
    product: "Pro Nail Drill Kit",
    shop: "NailHaus",
    pickup: "Westlands",
    dropoff: "Lavington",
    status: "Delivered",
    pay: "KES 520",
    time: "Yesterday",
  },
];

const STATUS_COLOURS: Record<string, string> = {
  "Pending pickup": "#EA580C",
  "In transit": "#BF8C2E",
  Delivered: "#1A7A6B",
  Disputed: "#C8284A",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  "Pending pickup": <Clock className="h-3.5 w-3.5" />,
  "In transit": <Truck className="h-3.5 w-3.5" />,
  Delivered: <CheckCircle2 className="h-3.5 w-3.5" />,
  Disputed: <XCircle className="h-3.5 w-3.5" />,
};

const MOCK_ZONES = ["Westlands", "Karen", "Kilimani", "Lavington", "CBD", "South B"];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function DeliveryDashboard() {
  return (
    <main className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-6 text-[var(--ms-charcoal)]">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#EA580C] text-white shadow-[0_12px_30px_rgba(234,88,12,0.3)]">
              <Truck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Rider Dashboard</p>
              <h1 className="text-xl font-semibold text-[var(--ms-navy)]">Hey, James M. 👋</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1A7A6B] shadow-[0_4px_12px_rgba(13,27,42,0.08)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified rider
            </span>
            <button className="rounded-full bg-white p-2.5 shadow-[0_4px_12px_rgba(13,27,42,0.08)]" type="button">
              <Bell className="h-5 w-5 text-[var(--ms-mauve)]" />
            </button>
          </div>
        </div>

        {/* Online / Offline toggle */}
        <div className="flex items-center justify-between rounded-[24px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_8px_24px_rgba(13,27,42,0.05)]">
          <div>
            <p className="text-sm font-semibold text-[var(--ms-navy)]">Availability</p>
            <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">Toggle to start or pause accepting deliveries</p>
          </div>
          {/* Decorative toggle — not wired to state (UI demo) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#1A7A6B]">Online</span>
            <button
              type="button"
              className="relative h-7 w-12 rounded-full bg-[#1A7A6B] transition"
              aria-label="Toggle availability"
            >
              <span className="absolute right-1 top-1 h-5 w-5 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[24px] border border-[var(--ms-border)] bg-white p-4 shadow-[0_8px_24px_rgba(13,27,42,0.05)]"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${stat.color}18`, color: stat.color }}
              >
                {stat.icon}
              </span>
              <p className="mt-3 text-xs text-[var(--ms-mauve)]">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--ms-navy)]">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)]">

          {/* Deliveries list */}
          <section className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_12px_40px_rgba(13,27,42,0.07)]">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Recent deliveries</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ms-navy)]">Delivery log</h2>
            </div>

            <div className="space-y-3">
              {MOCK_DELIVERIES.map((d) => (
                <div key={d.id} className="rounded-[16px] border border-[var(--ms-border)] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-[var(--ms-mauve)]">{d.id}</p>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: STATUS_COLOURS[d.status] ?? "#8c7280" }}
                    >
                      {STATUS_ICONS[d.status]}
                      {d.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[var(--ms-navy)]">{d.product}</p>
                  <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">From {d.shop}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs text-[var(--ms-mauve)]">
                      <MapPin className="h-3 w-3" />
                      {d.pickup} → {d.dropoff}
                    </div>
                    <p className="text-sm font-semibold text-[var(--ms-navy)]">{d.pay}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Right column */}
          <div className="space-y-5">

            {/* Active coverage zones */}
            <section className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_12px_40px_rgba(13,27,42,0.07)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Coverage zones</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ms-navy)]">{MOCK_ZONES.length} active zones</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {MOCK_ZONES.map((zone) => (
                  <span
                    key={zone}
                    className="inline-flex items-center gap-1 rounded-full border border-[rgba(234,88,12,0.3)] bg-[rgba(234,88,12,0.08)] px-2.5 py-1 text-xs font-semibold text-[#EA580C]"
                  >
                    <MapPin className="h-3 w-3" />
                    {zone}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-xs font-semibold underline underline-offset-2"
                style={{ color: "#EA580C" }}
              >
                Edit zones
              </button>
            </section>

            {/* Performance */}
            <section className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_12px_40px_rgba(13,27,42,0.07)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Performance</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ms-navy)]">This month</h2>
              <div className="mt-3 space-y-2.5">
                {[
                  { label: "On-time delivery rate", value: "96%", color: "#1A7A6B" },
                  { label: "Acceptance rate", value: "88%", color: "#BF8C2E" },
                  { label: "Completion rate", value: "100%", color: "#EA580C" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--ms-mauve)]">{m.label}</span>
                      <span className="font-semibold" style={{ color: m.color }}>{m.value}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ms-border)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: m.value,
                          backgroundColor: m.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Earnings panel */}
        <section className="rounded-[28px] bg-[var(--ms-navy)] p-6 text-white shadow-[0_20px_60px_rgba(13,27,42,0.22)]">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">This month</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--ms-gold)]">KES 18,340</p>
              <p className="mt-1 text-xs text-white/60">67 deliveries completed</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Pending release</p>
              <p className="mt-2 text-3xl font-semibold text-white">KES 740</p>
              <p className="mt-1 text-xs text-white/60">Releases on buyer confirmation</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Withdraw</p>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ms-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--ms-navy)] transition hover:brightness-110"
                type="button"
              >
                <WalletCards className="h-4 w-4" />
                Withdraw to M-Pesa
              </button>
              <p className="text-xs text-white/60">Available: KES 17,600</p>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Delivery history", icon: <Package className="h-4 w-4" /> },
            { label: "Analytics", icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Edit profile", icon: <ShieldCheck className="h-4 w-4" /> },
            { label: "Support", icon: <Bell className="h-4 w-4" /> },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ms-mauve)] shadow-[0_4px_12px_rgba(13,27,42,0.05)] transition hover:border-[#EA580C] hover:text-[#EA580C]"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
