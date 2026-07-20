"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  TrendingUp,
  Truck,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Mock data ─────────────────────────────────────────────────────────────────

const STATS = [
  { label: "Active listings", value: "12", icon: <Package className="h-5 w-5" />, color: "#8B5CF6" },
  { label: "New orders", value: "3", icon: <ShoppingBag className="h-5 w-5" />, color: "#C8284A" },
  { label: "Earnings this month", value: "KES 24,150", icon: <WalletCards className="h-5 w-5" />, color: "#BF8C2E" },
  { label: "Shop rating", value: "4.8 ✦", icon: <Star className="h-5 w-5" />, color: "#1A7A6B" },
];

const MOCK_ORDERS = [
  { id: "ORD-001", product: "Edge Control Gel — Extra Hold", buyer: "Client ×4J", status: "Pending", amount: "KES 850", time: "10 min ago" },
  { id: "ORD-002", product: "Vitamin C Glow Serum", buyer: "Client ×8M", status: "In transit", amount: "KES 2,100", time: "2 hrs ago" },
  { id: "ORD-003", product: "Matte Lip Kit", buyer: "Client ×2R", status: "Delivered", amount: "KES 1,200", time: "Yesterday" },
];

const MOCK_PRODUCTS = [
  { id: "1", name: "Edge Control Gel — Extra Hold", price: "KES 850", status: "Published", stock: 14 },
  { id: "2", name: "Vitamin C Glow Serum", price: "KES 2,100", status: "Published", stock: 7 },
  { id: "3", name: "Pro Nail Drill Kit", price: "KES 3,200", status: "Draft", stock: 3 },
  { id: "4", name: "Matte Lip Kit", price: "KES 1,200", status: "Sold Out", stock: 0 },
];

const ORDER_STATUS_COLOURS: Record<string, string> = {
  Pending: "#EA580C",
  "In transit": "#BF8C2E",
  Delivered: "#1A7A6B",
  Disputed: "#C8284A",
};

const PRODUCT_STATUS_COLOURS: Record<string, string> = {
  Published: "#1A7A6B",
  Draft: "#8c7280",
  "Sold Out": "#C8284A",
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function ShopDashboard() {
  return (
    <main className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-6 text-[var(--ms-charcoal)]">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#8B5CF6] text-white shadow-[0_12px_30px_rgba(139,92,246,0.3)]">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Shop Dashboard</p>
              <h1 className="text-xl font-semibold text-[var(--ms-navy)]">Beauty Base KE</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1A7A6B] shadow-[0_4px_12px_rgba(13,27,42,0.08)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified seller
            </span>
            <button className="rounded-full bg-white p-2.5 shadow-[0_4px_12px_rgba(13,27,42,0.08)]" type="button">
              <Bell className="h-5 w-5 text-[var(--ms-mauve)]" />
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

          {/* Products */}
          <section className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_12px_40px_rgba(13,27,42,0.07)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">My listings</p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--ms-navy)]">{MOCK_PRODUCTS.length} products</h2>
              </div>
              <Link
                href="/onboarding/shop/add-product"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" />
                Add product
              </Link>
            </div>

            <div className="space-y-2">
              {MOCK_PRODUCTS.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-[16px] bg-[var(--ms-soft-bg)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--ms-navy)]">{product.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">{product.price} · {product.stock} in stock</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: PRODUCT_STATUS_COLOURS[product.status] ?? "#8c7280" }}
                    >
                      {product.status}
                    </span>
                    <button className="text-[var(--ms-mauve)] transition hover:text-[var(--ms-navy)]" type="button">
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Orders */}
          <section className="rounded-[28px] border border-[var(--ms-border)] bg-white p-5 shadow-[0_12px_40px_rgba(13,27,42,0.07)]">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Recent orders</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ms-navy)]">Order inbox</h2>
            </div>

            <div className="space-y-3">
              {MOCK_ORDERS.map((order) => (
                <div key={order.id} className="rounded-[16px] border border-[var(--ms-border)] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-[var(--ms-mauve)]">{order.id}</p>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: ORDER_STATUS_COLOURS[order.status] ?? "#8c7280" }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[var(--ms-navy)]">{order.product}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-[var(--ms-mauve)]">{order.buyer} · {order.time}</p>
                    <p className="text-sm font-semibold text-[var(--ms-navy)]">{order.amount}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment-first rule notice */}
            <p className="mt-4 rounded-[14px] bg-[var(--ms-soft-bg)] px-3 py-2 text-[10px] leading-4 text-[var(--ms-mauve)]">
              🔒 Buyer details are only visible after payment is confirmed in escrow.
            </p>
          </section>
        </div>

        {/* Earnings panel */}
        <section className="rounded-[28px] bg-[var(--ms-navy)] p-6 text-white shadow-[0_20px_60px_rgba(13,27,42,0.22)]">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">This month</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--ms-gold)]">KES 24,150</p>
              <p className="mt-1 text-xs text-white/60">Commission deducted: KES 1,208</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Pending escrow</p>
              <p className="mt-2 text-3xl font-semibold text-white">KES 4,250</p>
              <p className="mt-1 text-xs text-white/60">Releases on delivery confirmation</p>
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
              <p className="text-xs text-white/60">Available: KES 22,942</p>
            </div>
          </div>
        </section>

        {/* Subscription status */}
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--ms-border)] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Subscription</p>
            <p className="mt-2 text-lg font-semibold text-[#8B5CF6]">Shop Growth</p>
            <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">Next billing: 30 May 2026 · KES 3,500</p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-full border border-[var(--ms-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ms-mauve)] hover:border-[#8B5CF6] hover:text-[#8B5CF6]" type="button">
                Upgrade to Shop+
              </button>
              <button className="rounded-full border border-[var(--ms-border)] px-3 py-1.5 text-xs text-[var(--ms-mauve)]" type="button">
                Manage plan
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--ms-border)] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">Promoted listings</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ms-navy)]">1 active promotion</p>
            <p className="mt-0.5 text-xs text-[var(--ms-mauve)]">Edge Control Gel · 342 views · 14 clicks</p>
            <div className="mt-3">
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                type="button"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Create promotion
              </button>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Add product", href: "/onboarding/shop/add-product", icon: <Plus className="h-4 w-4" /> },
            { label: "View Counter page", href: "/counter", icon: <ShoppingBag className="h-4 w-4" /> },
            { label: "Delivery settings", href: "/dashboard/shop/delivery", icon: <Truck className="h-4 w-4" /> },
            { label: "Analytics", href: "/dashboard/shop/analytics", icon: <TrendingUp className="h-4 w-4" /> },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ms-mauve)] shadow-[0_4px_12px_rgba(13,27,42,0.05)] transition hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
            >
              {action.icon}
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
