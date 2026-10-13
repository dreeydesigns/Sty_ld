"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Diamond,
  Droplets,
  Gem,
  Heart,
  LayoutGrid,
  Scissors,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Truck,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { readSettings } from "@/lib/settings-store";

// ─── Category data ─────────────────────────────────────────────────────────────

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
}

const categories: Category[] = [
  { id: "all",         label: "All",          icon: LayoutGrid },
  { id: "hair",        label: "Hair",         icon: Scissors   },
  { id: "nails",       label: "Nails",        icon: Gem        },
  { id: "skincare",    label: "Skincare",     icon: Droplets   },
  { id: "tools",       label: "Tools",        icon: Wrench     },
  { id: "accessories", label: "Accessories",  icon: Diamond    },
  { id: "wellness",    label: "Wellness",     icon: Heart      },
];

// ─── Preview product data ──────────────────────────────────────────────────────
// Counter is not live yet. These listings are illustrative product information
// only. Ordering, payment, delivery and seller verification are not available,
// so no rating, review count or "verified" status is shown.

interface Product {
  id: string;
  name: string;
  brand: string;
  shopName: string;
  price: number;
  category: string;
  image: string;
  /** 18+ adult product — filtered by the showAdultProducts setting */
  adult?: boolean;
}

const placeholderProducts: Product[] = [
  {
    id: "1",
    name: "Edge Control Gel — Extra Hold",
    brand: "Cantu",
    shopName: "Beauty Base KE",
    price: 850,
    category: "hair",
    image: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "2",
    name: "Matte Lip Kit — Nairobi Nude",
    brand: "Zuri Beauty",
    shopName: "Zuri Beauty Official",
    price: 1200,
    category: "accessories",
    image: "https://images.pexels.com/photos/2693644/pexels-photo-2693644.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "3",
    name: "Natural Hair Moisturiser",
    brand: "Shea Moisture",
    shopName: "NaturalGlow KE",
    price: 1650,
    category: "hair",
    image: "https://images.pexels.com/photos/5797991/pexels-photo-5797991.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "4",
    name: "Pro Nail Drill Kit — 35W",
    brand: "NailTech Pro",
    shopName: "ProNails KE",
    price: 3200,
    category: "tools",
    image: "https://images.pexels.com/photos/3997373/pexels-photo-3997373.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "5",
    name: "Vitamin C Glow Serum",
    brand: "Radiant Skin Co.",
    shopName: "GlowUp KE",
    price: 2100,
    category: "skincare",
    image: "https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "6",
    name: "Rose Quartz Gua Sha Set",
    brand: "SkinRitual",
    shopName: "Wellness Corner KE",
    price: 1400,
    category: "wellness",
    image: "https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  // ── 18+ adult products — visible only when showAdultProducts setting is ON ──
  {
    id: "7",
    name: "Intimate Care Cleansing Gel",
    brand: "FemCare Pro",
    shopName: "Wellness Corner KE",
    price: 950,
    category: "wellness",
    image: "https://images.pexels.com/photos/6621374/pexels-photo-6621374.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
    adult: true,
  },
  {
    id: "8",
    name: "Body Contouring Massage Oil",
    brand: "Luxe Body Lab",
    shopName: "GlowUp KE",
    price: 1800,
    category: "wellness",
    image: "https://images.pexels.com/photos/3997389/pexels-photo-3997389.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
    adult: true,
  },
];

// ─── Trust signals ──────────────────────────────────────────────────────────────

const trustSignals = [
  {
    icon: ShieldCheck,
    title: "Preview only",
    copy: "Counter is not live yet. Listings are shown for preview and cannot be purchased.",
  },
  {
    icon: Tag,
    title: "Prices in KES",
    copy: "Every price is shown in Kenyan shillings.",
  },
  {
    icon: ShoppingBag,
    title: "Ordering coming soon",
    copy: "Shopping, payment and checkout are not available yet.",
  },
  {
    icon: Truck,
    title: "Delivery coming soon",
    copy: "Delivery is not available yet. There is no rider or courier network live.",
  },
];

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

// ─── Product card ───────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const [saved,    setSaved]    = useState(false);
  const [reported, setReported] = useState(false);

  return (
    <article className="group min-w-0 overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)]">
      {/* Photo */}
      <Link href={`/counter/product/${product.id}`} className="block">
        <div className="relative h-[200px] overflow-hidden bg-[var(--surface-elevated)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            loading="lazy"
            src={product.image}
          />

          {/* Save */}
          <button
            aria-label={saved ? "Unsave product" : "Save product"}
            className={cn(
              "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border transition",
              saved
                ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-card)]/90 text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]",
            )}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaved((v) => !v); }}
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
          </button>
        </div>
      </Link>

      <div className="p-4">
        <p className="text-[11px] font-medium tracking-[0.04em] text-[var(--color-secondary)]">{product.brand}</p>

        <Link href={`/counter/product/${product.id}`}>
          <h3 className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--text-primary)] hover:text-[var(--color-accent)] transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="mt-1 flex items-center gap-1.5">
          <Store className="h-3 w-3 shrink-0 text-[var(--color-secondary)]" />
          <span className="truncate text-[11px] text-[var(--color-secondary)]">{product.shopName}</span>
        </div>

        {/* Price + Ordering unavailable */}
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-[var(--text-primary)]">{formatKES(product.price)}</p>
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-action-primary)] px-4 py-2 text-[12px] font-semibold text-[var(--color-action-primary-text)] opacity-60"
            type="button"
            disabled
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Coming soon
          </button>
        </div>

        {/* Report link */}
        <p className="mt-2.5 rounded-[10px] bg-[var(--surface-card)] px-3 py-2 text-[10px] leading-4 text-[var(--color-secondary)]">
          Expect the real thing.{" "}
          <button
            className="text-[var(--color-accent)] underline"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setReported(true);
              setTimeout(() => setReported(false), 3000);
            }}
          >
            {reported ? "Report sent" : "Report this product"}
          </button>
        </p>
      </div>
    </article>
  );
}

// ─── Main Counter UI ────────────────────────────────────────────────────────────

export function CounterUI() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery,    setSearchQuery]    = useState("");

  // Read the 18+ setting — synced from localStorage
  const [showAdult, setShowAdult] = useState(() => readSettings().showAdultProducts);
  useEffect(() => {
    function syncSetting() {
      setShowAdult(readSettings().showAdultProducts);
    }
    window.addEventListener("ms-settings-change", syncSetting);
    window.addEventListener("storage", syncSetting);
    return () => {
      window.removeEventListener("ms-settings-change", syncSetting);
      window.removeEventListener("storage", syncSetting);
    };
  }, []);

  const hiddenAdultCount = placeholderProducts.filter((p) => p.adult && !showAdult).length;

  const filtered = placeholderProducts.filter((p) => {
    // Hide adult products when setting is off
    if (p.adult && !showAdult) return false;
    const matchesCat    = activeCategory === "all" || p.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <div className="section-grid">

      {/* Hero header */}
      <div className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,var(--color-ink),#2A2A28_55%,var(--color-secondary))] px-6 py-8 text-white shadow-[0_24px_80px_rgba(29,29,27,0.28)] sm:px-8 sm:py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              Beauty Products Marketplace
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              Counter.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/76">
              Beauty products from Kenyan sellers. Counter shopping is not live yet, so browse the preview listings below.
            </p>
          </div>

          {/* Cart */}
          <Link
            href="/counter/cart"
            className="relative shrink-0 rounded-full bg-white/15 p-3 text-white transition hover:bg-white/25"
            aria-label="View cart"
          >
            <ShoppingBag className="h-6 w-6" />
          </Link>
        </div>

        {/* Search */}
        <div className="mt-6 flex items-center gap-3 rounded-[22px] border border-white/20 bg-white/12 px-4 py-3 backdrop-blur">
          <Search className="h-4 w-4 shrink-0 text-white/60" />
          <input
            className="w-full bg-transparent text-sm text-white placeholder:text-white/48 outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, brands, categories..."
            value={searchQuery}
          />
        </div>

        {/* CTAs */}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white/90"
          >
            <Store className="h-4 w-4" />
            Create an account
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Category pills — icon + label, no emojis */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition",
                active
                  ? "border-[var(--color-action-primary)] bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-sm"
                  : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 1.75} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Trust signals */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {trustSignals.map((signal) => {
          const Icon = signal.icon;
          return (
            <div
              key={signal.title}
              className="flex items-start gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-4 shadow-[0_2px_8px_rgba(13,27,42,0.04)]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--color-accent)]">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">{signal.title}</p>
                <p className="mt-0.5 text-[11px] leading-5 text-[var(--color-secondary)]">{signal.copy}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 18+ hidden banner — shown when adult products exist but setting is off */}
      {hiddenAdultCount > 0 && !showAdult && (
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 transition hover:border-amber-500/40"
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 " strokeWidth={1.85} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-amber-800 ">
              {hiddenAdultCount} adult product{hiddenAdultCount !== 1 ? "s" : ""} hidden
            </p>
            <p className="text-[11px] text-amber-700 ">
              Enable 18+ products in Settings to view them.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-semibold text-amber-700 ">
            Settings →
          </span>
        </Link>
      )}

      {/* Products grid */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-secondary)]">
              {activeCat?.label ?? "All Products"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-card)] px-4 py-2 text-[12px] font-medium text-[var(--color-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" strokeWidth={1.75} />
            Preview listings
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-12 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-[var(--color-secondary)] opacity-40" />
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No products found</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-secondary)]">
              Try a different category or search term.
            </p>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--text-primary)]"
              onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
              type="button"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Shop owner CTA */}
      <div className="overflow-hidden rounded-[32px] bg-[var(--color-ink)] px-6 py-8 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">For shop owners</p>
        <h2 className="mt-3 font-display text-3xl leading-tight">
          Selling on Styld is coming soon.
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/72">
          Shop accounts, listings, payments and delivery are not available yet. We are not collecting
          business, tax or payout details at this time.
        </p>
        <Link
          href="/auth/sign-up"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-action-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-action-primary-text)] transition hover:opacity-90"
        >
          Create an account
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Age-gated notice */}
      <div className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-4">
        <p className="text-[13px] text-[var(--color-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">18+ products</span> are hidden by default.
          To view adult products, go to{" "}
          <span className="font-semibold text-[var(--text-primary)]">Settings → Counter → View 18+ products</span>{" "}
          and confirm your age. Products intended for adults aged 18 and above only.
        </p>
      </div>
    </div>
  );
}
