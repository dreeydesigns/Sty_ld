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
  Leaf,
  Scissors,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Truck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { readSettings } from "@/lib/settings-store";

// ─── Category data ─────────────────────────────────────────────────────────────

interface Category {
  id: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ElementType<any>;
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

// ─── Placeholder product data ───────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  brand: string;
  shopName: string;
  price: number;
  rating: number;
  reviewCount: number;
  category: string;
  badge: string;
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
    rating: 4.8,
    reviewCount: 24,
    category: "hair",
    badge: "Top Seller",
    image: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "2",
    name: "Matte Lip Kit — Nairobi Nude",
    brand: "Zuri Beauty",
    shopName: "Zuri Beauty Official",
    price: 1200,
    rating: 4.6,
    reviewCount: 18,
    category: "accessories",
    badge: "New",
    image: "https://images.pexels.com/photos/2693644/pexels-photo-2693644.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "3",
    name: "Natural Hair Moisturiser",
    brand: "Shea Moisture",
    shopName: "NaturalGlow KE",
    price: 1650,
    rating: 4.9,
    reviewCount: 43,
    category: "hair",
    badge: "Verified Brand",
    image: "https://images.pexels.com/photos/5797991/pexels-photo-5797991.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "4",
    name: "Pro Nail Drill Kit — 35W",
    brand: "NailTech Pro",
    shopName: "ProNails KE",
    price: 3200,
    rating: 4.7,
    reviewCount: 12,
    category: "tools",
    badge: "Professional",
    image: "https://images.pexels.com/photos/3997373/pexels-photo-3997373.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "5",
    name: "Vitamin C Glow Serum",
    brand: "Radiant Skin Co.",
    shopName: "GlowUp KE",
    price: 2100,
    rating: 4.8,
    reviewCount: 31,
    category: "skincare",
    badge: "Trending",
    image: "https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  {
    id: "6",
    name: "Rose Quartz Gua Sha Set",
    brand: "SkinRitual",
    shopName: "Wellness Corner KE",
    price: 1400,
    rating: 4.5,
    reviewCount: 9,
    category: "wellness",
    badge: "New",
    image: "https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  },
  // ── 18+ adult products — visible only when showAdultProducts setting is ON ──
  {
    id: "7",
    name: "Intimate Care Cleansing Gel",
    brand: "FemCare Pro",
    shopName: "Wellness Corner KE",
    price: 950,
    rating: 4.7,
    reviewCount: 7,
    category: "wellness",
    badge: "18+",
    image: "https://images.pexels.com/photos/6621374/pexels-photo-6621374.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
    adult: true,
  },
  {
    id: "8",
    name: "Body Contouring Massage Oil",
    brand: "Luxe Body Lab",
    shopName: "GlowUp KE",
    price: 1800,
    rating: 4.5,
    reviewCount: 11,
    category: "wellness",
    badge: "18+",
    image: "https://images.pexels.com/photos/3997389/pexels-photo-3997389.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
    adult: true,
  },
];

// ─── Trust signals ──────────────────────────────────────────────────────────────

const trustSignals = [
  {
    icon: ShieldCheck,
    title: "Verified sellers only",
    copy: "Every shop has a KRA PIN and business registration on file.",
  },
  {
    icon: Tag,
    title: "Genuine products",
    copy: "Sellers attest to product authenticity on every listing. Report a counterfeit in 3 taps.",
  },
  {
    icon: ShoppingBag,
    title: "Escrow protection",
    copy: "Your money is held safely. Released only when you confirm receipt.",
  },
  {
    icon: Truck,
    title: "Delivery available",
    copy: "Shop+ sellers offer Nairobi-wide delivery through verified delivery partners.",
  },
];

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

// ─── Product card ───────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const [added,    setAdded]    = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [reported, setReported] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      shopName: product.shopName,
      price: product.price,
      image: product.image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <article className="group min-w-0 overflow-hidden rounded-[20px] border border-[var(--ms-border)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)]">
      {/* Photo */}
      <Link href={`/counter/product/${product.id}`} className="block">
        <div className="relative h-[200px] overflow-hidden bg-[var(--ms-soft-bg)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            loading="lazy"
            src={product.image}
          />

          {/* Badge */}
          {product.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--ms-navy)] shadow-sm">
              {product.badge}
            </span>
          )}

          {/* Save */}
          <button
            aria-label={saved ? "Unsave product" : "Save product"}
            className={cn(
              "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border transition",
              saved
                ? "border-[var(--ms-plum)] bg-[var(--ms-plum)] text-white"
                : "border-white/60 bg-white/80 text-[var(--ms-mauve)] hover:bg-white hover:text-[var(--ms-plum)]",
            )}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaved((v) => !v); }}
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-white")} />
          </button>
        </div>
      </Link>

      <div className="p-4">
        <p className="text-[11px] font-medium tracking-[0.04em] text-[var(--ms-mauve)]">{product.brand}</p>

        <Link href={`/counter/product/${product.id}`}>
          <h3 className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--ms-navy)] hover:text-[var(--ms-plum)] transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="mt-1.5 flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-[var(--ms-gold)] text-[var(--ms-gold)]" />
          <span className="text-[12px] font-semibold text-[var(--ms-charcoal)]">{product.rating}</span>
          <span className="text-[11px] text-[var(--ms-mauve)]">({product.reviewCount})</span>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <Store className="h-3 w-3 shrink-0 text-[var(--ms-mauve)]" />
          <span className="truncate text-[11px] text-[var(--ms-mauve)]">{product.shopName}</span>
        </div>

        {/* Price + Add */}
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-[var(--ms-navy)]">{formatKES(product.price)}</p>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold text-white transition",
              added
                ? "bg-[#1A7A6B]"
                : "bg-[var(--ms-plum)] hover:brightness-110",
            )}
            type="button"
            onClick={handleAdd}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {added ? "Added" : "Add"}
          </button>
        </div>

        {/* Report link */}
        <p className="mt-2.5 rounded-[10px] bg-[var(--ms-soft-bg)] px-3 py-2 text-[10px] leading-4 text-[var(--ms-mauve)]">
          Expect the real thing.{" "}
          <button
            className="text-[var(--ms-rose)] underline"
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
  const cartCount = useCartStore((s) => s.count());

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
      <div className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,var(--ms-plum),#512548_55%,var(--ms-rose))] px-6 py-8 text-white shadow-[0_24px_80px_rgba(58,24,58,0.28)] sm:px-8 sm:py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              Beauty Products Marketplace
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              Counter.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/76">
              Genuine beauty products from verified Kenyan sellers. Escrow-protected. Delivered across Nairobi.
            </p>
          </div>

          {/* Cart */}
          <Link
            href="/counter/cart"
            className="relative shrink-0 rounded-full bg-white/15 p-3 text-white transition hover:bg-white/25"
            aria-label="View cart"
          >
            <ShoppingBag className="h-6 w-6" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ms-gold)] text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
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
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ms-navy)] transition hover:bg-[var(--ms-ivory)]"
          >
            <Store className="h-4 w-4" />
            Open a Shop
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Sign in to buy
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
                  ? "border-[var(--ms-plum)] bg-[var(--ms-plum)] text-white shadow-[0_4px_12px_rgba(132,36,92,0.22)]"
                  : "border-[var(--ms-border)] bg-white text-[var(--ms-mauve)] hover:border-[var(--ms-plum)]/40 hover:text-[var(--ms-navy)]",
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
              className="flex items-start gap-3 rounded-[22px] border border-[var(--ms-border)] bg-white px-4 py-4 shadow-[0_2px_8px_rgba(13,27,42,0.04)]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ms-plum)]/8 text-[var(--ms-plum)]">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-[var(--ms-navy)]">{signal.title}</p>
                <p className="mt-0.5 text-[11px] leading-5 text-[var(--ms-mauve)]">{signal.copy}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 18+ hidden banner — shown when adult products exist but setting is off */}
      {hiddenAdultCount > 0 && !showAdult && (
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 transition hover:border-amber-300"
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={1.85} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-amber-800">
              {hiddenAdultCount} adult product{hiddenAdultCount !== 1 ? "s" : ""} hidden
            </p>
            <p className="text-[11px] text-amber-700">
              Enable 18+ products in Settings to view them — age verification required.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
            Settings →
          </span>
        </Link>
      )}

      {/* Products grid */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ms-mauve)]">
              {activeCat?.label ?? "All Products"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--ms-plum)]">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--ms-soft-bg)] px-4 py-2 text-[12px] font-medium text-[var(--ms-mauve)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--ms-plum)]" strokeWidth={1.75} />
            Verified sellers
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[var(--ms-border)] bg-white px-5 py-12 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-[var(--ms-mauve)] opacity-40" />
            <h3 className="mt-4 text-lg font-semibold text-[var(--ms-navy)]">No products found</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--ms-mauve)]">
              Try a different category or search term.
            </p>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] px-5 py-2.5 text-sm font-semibold text-[var(--ms-mauve)] transition hover:border-[var(--ms-plum)] hover:text-[var(--ms-navy)]"
              onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
              type="button"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Shop owner CTA */}
      <div className="overflow-hidden rounded-[32px] bg-[var(--ms-navy)] px-6 py-8 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">For shop owners</p>
        <h2 className="mt-3 font-display text-3xl leading-tight">
          Sell your beauty products here.
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/72">
          Register a Shop account. List up to 50 products on the Basic plan.
          Reach thousands of clients across Nairobi. 5% commission only when you sell.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { label: "5% commission",        sub: "Deducted from payout only"           },
            { label: "Escrow protection",     sub: "Get paid after delivery confirmed"   },
            { label: "Promoted listings",     sub: "Growth & Shop+ plans available"      },
            { label: "Delivery integration",  sub: "Shop+ includes rider network"        },
          ].map((item) => (
            <div key={item.label} className="rounded-[18px] bg-white/8 px-4 py-3">
              <p className="text-[13px] font-semibold text-[var(--ms-gold)]">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-white/60">{item.sub}</p>
            </div>
          ))}
        </div>
        <Link
          href="/auth/sign-up"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ms-rose)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Register a Shop account
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Age-gated notice */}
      <div className="rounded-[22px] border border-[var(--ms-border)] bg-white px-5 py-4">
        <p className="text-[13px] text-[var(--ms-mauve)]">
          <span className="font-semibold text-[var(--ms-navy)]">18+ products</span> are hidden by default.
          To view adult products, go to{" "}
          <span className="font-semibold text-[var(--ms-navy)]">Settings → Counter → View 18+ products</span>{" "}
          and confirm your age. Products intended for adults aged 18 and above only.
        </p>
      </div>
    </div>
  );
}
