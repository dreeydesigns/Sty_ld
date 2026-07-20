"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
} from "lucide-react";

import { useCartStore } from "@/lib/cart-store";

// ─── Mock product data (matches counter-ui placeholderProducts) ────────────────

const PRODUCTS = [
  {
    id: "1",
    name: "Edge Control Gel — Extra Hold",
    brand: "Cantu",
    shopName: "Beauty Base KE",
    shopVerified: true,
    price: 850,
    originalPrice: null,
    rating: 4.8,
    reviewCount: 24,
    category: "hair",
    badge: "Top Seller",
    inStock: true,
    stockCount: 14,
    ageRestricted: false,
    description:
      "A firm-hold edge control gel that keeps edges laid for up to 48 hours. Enriched with shea butter and coconut oil to moisturise while you style. No flaking, no white residue. Suitable for all hair types.",
    images: [
      "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
      "https://images.pexels.com/photos/5797991/pexels-photo-5797991.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
      "https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    reviews: [
      { id: "r1", author: "Amina K.", rating: 5, body: "This is the best edge control I have used. Holds all day even in humidity.", date: "12 Apr 2026", asDescribed: true, verified: true },
      { id: "r2", author: "Faith O.", rating: 5, body: "Doesn't flake or leave a white cast. Love it.", date: "28 Mar 2026", asDescribed: true, verified: true },
      { id: "r3", author: "Grace M.", rating: 4, body: "Great hold, scent is a bit strong but fades quickly.", date: "15 Mar 2026", asDescribed: true, verified: true },
    ],
    relatedIds: ["2", "3", "5"],
  },
  {
    id: "2",
    name: "Matte Lip Kit — Nairobi Nude",
    brand: "Zuri Beauty",
    shopName: "Zuri Beauty Official",
    shopVerified: true,
    price: 1200,
    originalPrice: 1500,
    rating: 4.6,
    reviewCount: 18,
    category: "accessories",
    badge: "New",
    inStock: true,
    stockCount: 7,
    ageRestricted: false,
    description: "A long-wearing matte lip kit designed for deeper skin tones. Includes a lip liner and liquid lipstick in the iconic Nairobi Nude shade — warm, earthy, and universally flattering.",
    images: [
      "https://images.pexels.com/photos/2693644/pexels-photo-2693644.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    reviews: [
      { id: "r1", author: "Sharon N.", rating: 5, body: "Perfect nude for brown skin. Finally!", date: "20 Apr 2026", asDescribed: true, verified: true },
    ],
    relatedIds: ["1", "4"],
  },
  {
    id: "3",
    name: "Natural Hair Moisturiser",
    brand: "Shea Moisture",
    shopName: "NaturalGlow KE",
    shopVerified: true,
    price: 1650,
    originalPrice: null,
    rating: 4.9,
    reviewCount: 43,
    category: "hair",
    badge: "Verified Brand",
    inStock: true,
    stockCount: 22,
    ageRestricted: false,
    description: "Deep conditioning moisturiser formulated for 4C natural hair. Contains raw shea butter, hibiscus extract, and coconut oil for defined curls and all-day moisture retention.",
    images: [
      "https://images.pexels.com/photos/5797991/pexels-photo-5797991.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    reviews: [
      { id: "r1", author: "Wanjiku N.", rating: 5, body: "My curls have never looked better. A must-have.", date: "18 Apr 2026", asDescribed: true, verified: true },
    ],
    relatedIds: ["1", "6"],
  },
  {
    id: "4",
    name: "Pro Nail Drill Kit — 35W",
    brand: "NailTech Pro",
    shopName: "ProNails KE",
    shopVerified: true,
    price: 3200,
    originalPrice: null,
    rating: 4.7,
    reviewCount: 12,
    category: "tools",
    badge: "Professional",
    inStock: false,
    stockCount: 0,
    ageRestricted: false,
    description: "Professional-grade nail drill with 35W motor and variable speed control. Includes 6 interchangeable drill bits. Suitable for gel, acrylic, and natural nail care.",
    images: [
      "https://images.pexels.com/photos/3997373/pexels-photo-3997373.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    reviews: [],
    relatedIds: ["2"],
  },
  {
    id: "5",
    name: "Vitamin C Glow Serum",
    brand: "Radiant Skin Co.",
    shopName: "GlowUp KE",
    shopVerified: true,
    price: 2100,
    originalPrice: null,
    rating: 4.8,
    reviewCount: 31,
    category: "skincare",
    badge: "Trending",
    inStock: true,
    stockCount: 5,
    ageRestricted: false,
    description: "A brightening serum with 15% stabilised Vitamin C, niacinamide, and hyaluronic acid. Evens skin tone, reduces dark spots, and gives a natural glass-skin glow. Dermatologist-tested for Kenyan skin.",
    images: [
      "https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    reviews: [
      { id: "r1", author: "Lydia A.", rating: 5, body: "Cleared my dark spots in 3 weeks. Incredible.", date: "22 Apr 2026", asDescribed: true, verified: true },
    ],
    relatedIds: ["3", "6"],
  },
  {
    id: "6",
    name: "Rose Quartz Gua Sha Set",
    brand: "SkinRitual",
    shopName: "Wellness Corner KE",
    shopVerified: false,
    price: 1400,
    originalPrice: null,
    rating: 4.5,
    reviewCount: 9,
    category: "wellness",
    badge: "New",
    inStock: true,
    stockCount: 18,
    ageRestricted: false,
    description: "A rose quartz gua sha stone and jade roller combo for facial lymphatic drainage and de-puffing. Includes a how-to guide card. Cool to the touch for an instant de-puffing effect.",
    images: [
      "https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    reviews: [],
    relatedIds: ["3", "5"],
  },
];

function formatKES(n: number) {
  return `KES ${n.toLocaleString()}`;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ category, name }: { category: string; name: string }) {
  return (
    <nav className="mb-4 flex items-center gap-2 text-[13px] text-[var(--ms-mauve)]">
      <Link href="/counter" className="hover:text-[var(--ms-navy)]">Counter</Link>
      <span className="opacity-40">›</span>
      <Link href={`/counter?category=${category}`} className="capitalize hover:text-[var(--ms-navy)]">{category}</Link>
      <span className="opacity-40">›</span>
      <span className="truncate font-semibold text-[var(--ms-navy)]">{name}</span>
    </nav>
  );
}

// ─── Star breakdown (mock) ─────────────────────────────────────────────────────

function StarBreakdown({ rating, total }: { rating: number; total: number }) {
  const bars = [
    { star: 5, pct: 72 }, { star: 4, pct: 18 }, { star: 3, pct: 7 },
    { star: 2, pct: 2 }, { star: 1, pct: 1 },
  ];
  return (
    <div className="space-y-1.5">
      {bars.map((b) => (
        <div key={b.star} className="flex items-center gap-2 text-xs text-[var(--ms-mauve)]">
          <span className="w-4 shrink-0 text-right">{b.star}★</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--ms-border)]">
            <div className="h-full rounded-full bg-[var(--ms-gold)]" style={{ width: `${b.pct}%` }} />
          </div>
          <span className="w-8 shrink-0">{b.pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Counter Product Detail ───────────────────────────────────────────────────

export function CounterProductDetail({ productId }: { productId: string }) {
  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0];
  const related = PRODUCTS.filter((p) => product.relatedIds.includes(p.id));

  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showReviews, setShowReviews] = useState(5);
  const [reported, setReported] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  function handleReport() {
    setReported(true);
    setTimeout(() => setReported(false), 3000);
  }

  function handleAdd() {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id,
        name: product.name,
        brand: product.brand,
        shopName: product.shopName,
        price: product.price,
        image: product.images[0],
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const stockStatus = !product.inStock
    ? { label: "Sold out", color: "#C8284A" }
    : product.stockCount <= 5
    ? { label: `Low stock — ${product.stockCount} left`, color: "#BF8C2E" }
    : { label: "In stock", color: "#1A7A6B" };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-4">
      <Breadcrumb category={product.category} name={product.name} />

      {/* Main layout */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">

        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-[24px] bg-[var(--ms-soft-bg)]">
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className="h-full w-full object-cover transition-all duration-300"
            />
            {product.badge && (
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--ms-navy)]">
                {product.badge}
              </span>
            )}
            {/* Mobile swipe arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImage((i) => (i - 1 + product.images.length) % product.images.length)}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--ms-navy)] shadow lg:hidden"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((i) => (i + 1) % product.images.length)}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--ms-navy)] shadow lg:hidden"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2.5">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-square w-[72px] shrink-0 overflow-hidden rounded-[14px] border-2 transition ${
                    activeImage === idx
                      ? "border-[var(--ms-rose)] shadow-[0_0_0_3px_rgba(214,51,108,0.15)]"
                      : "border-transparent opacity-55 hover:opacity-90"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--ms-mauve)]">{product.brand}</p>
          <h1 className="text-2xl font-semibold text-[var(--ms-navy)]">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 text-[var(--ms-gold)]">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`h-4 w-4 ${n <= Math.round(product.rating) ? "fill-current" : "opacity-30"}`} />
              ))}
            </div>
            <span className="text-sm font-semibold text-[var(--ms-navy)]">{product.rating}</span>
            <a href="#reviews" className="text-sm text-[var(--ms-rose)] underline underline-offset-2">
              ({product.reviewCount} reviews)
            </a>
          </div>

          {/* Seller */}
          <div className="flex items-center gap-2 text-sm text-[var(--ms-mauve)]">
            <Store className="h-4 w-4" />
            <span>{product.shopName}</span>
            {product.shopVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(26,122,107,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[#1A7A6B]">
                <ShieldCheck className="h-3 w-3" /> Verified seller
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <p className="text-[28px] font-semibold text-[var(--ms-navy)]">{formatKES(product.price)}</p>
            {product.originalPrice && (
              <p className="text-lg text-[var(--ms-mauve)] line-through">{formatKES(product.originalPrice)}</p>
            )}
          </div>

          {/* Stock */}
          <span
            className="inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: stockStatus.color }}
          >
            {stockStatus.label}
          </span>

          {/* Age restriction */}
          {product.ageRestricted && (
            <div className="flex items-start gap-2 rounded-[12px] border border-amber-300 bg-amber-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-700">This product is for adults 18+ only.</p>
            </div>
          )}

          {/* Description */}
          <div>
            <p className={`text-sm leading-7 text-[var(--ms-charcoal)] ${!showFullDesc ? "line-clamp-4" : ""}`}>
              {product.description}
            </p>
            <button
              type="button"
              onClick={() => setShowFullDesc((v) => !v)}
              className="mt-1 text-xs font-semibold text-[var(--ms-rose)] underline underline-offset-2"
            >
              {showFullDesc ? "Show less" : "Read more"}
            </button>
          </div>

          {/* Add to Cart — desktop */}
          <div className="hidden lg:block space-y-3">
            {/* Quantity picker */}
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ms-mauve)]">Qty</p>
              <div className="flex items-center overflow-hidden rounded-[12px] border border-[var(--ms-border)]">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex h-9 w-9 items-center justify-center text-[var(--ms-mauve)] transition hover:bg-[var(--ms-soft-bg)] disabled:opacity-30"
                >
                  <span className="text-lg leading-none">−</span>
                </button>
                <span className="w-8 text-center text-sm font-semibold text-[var(--ms-navy)]">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  disabled={!product.inStock || qty >= product.stockCount}
                  className="flex h-9 w-9 items-center justify-center text-[var(--ms-mauve)] transition hover:bg-[var(--ms-soft-bg)] disabled:opacity-30"
                >
                  <span className="text-lg leading-none">+</span>
                </button>
              </div>
              {product.inStock && product.stockCount <= 5 && (
                <p className="text-[11px] text-[#BF8C2E]">Only {product.stockCount} left</p>
              )}
            </div>
            <button
              type="button"
              disabled={!product.inStock}
              onClick={handleAdd}
              className="w-full rounded-[16px] bg-[var(--ms-rose)] py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {added ? `${qty > 1 ? `${qty}× ` : ""}Added to cart ✓` : `Add to cart${qty > 1 ? ` (${qty})` : ""}`}
            </button>
            <p className="text-[11px] text-center text-[var(--ms-mauve)]">
              You pay securely through the platform. Seller receives payment only after you confirm receipt.
            </p>
            <div className="flex items-start gap-2 rounded-[12px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-4 py-3">
              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ms-mauve)]" />
              <p className="text-[11px] leading-4 text-[var(--ms-mauve)]">
                Expect the real thing.{" "}
                <button type="button" onClick={handleReport} className="text-[var(--ms-rose)] underline">{reported ? "Report sent ✓" : "Report this product"}</button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-10 space-y-5">
        <div className="grid gap-5 sm:grid-cols-[200px_1fr] sm:items-start">
          <div>
            <p className="text-[20px] font-semibold text-[var(--ms-navy)]">What buyers say</p>
            <p className="mt-1 text-sm text-[var(--ms-mauve)]">{product.reviewCount} reviews · ★ {product.rating}</p>
            <div className="mt-4">
              <StarBreakdown rating={product.rating} total={product.reviewCount} />
            </div>
          </div>
          <div className="space-y-3">
            {product.reviews.slice(0, showReviews).map((rev) => (
              <div key={rev.id} className="rounded-[16px] border border-[var(--ms-border)] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-0.5 text-[var(--ms-gold)]">
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= rev.rating ? "fill-current" : "opacity-20"}`} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold ${rev.asDescribed ? "text-[#1A7A6B]" : "text-[#C8284A]"}`}>
                    {rev.asDescribed ? "✓ As described" : "✗ Not as described"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--ms-charcoal)]">{rev.body}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--ms-mauve)]">
                  <span className="font-semibold">{rev.author}</span>
                  {rev.verified && <span className="rounded-full bg-[var(--ms-soft-bg)] px-2 py-0.5">Verified buyer</span>}
                  <span>{rev.date}</span>
                </div>
              </div>
            ))}
            {product.reviews.length === 0 && (
              <p className="rounded-[14px] bg-[var(--ms-soft-bg)] px-4 py-6 text-center text-sm text-[var(--ms-mauve)]">
                No reviews yet. Be the first after purchase.
              </p>
            )}
            {showReviews < product.reviews.length && (
              <button
                type="button"
                onClick={() => setShowReviews((n) => n + 5)}
                className="rounded-full border border-[var(--ms-border)] px-6 py-2 text-sm font-semibold text-[var(--ms-mauve)] transition hover:border-[var(--ms-rose)] hover:text-[var(--ms-rose)]"
              >
                Load more reviews
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="text-[20px] font-semibold text-[var(--ms-navy)]">Similar products</h2>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/counter/product/${p.id}`}
                className="w-[260px] shrink-0 overflow-hidden rounded-[16px] border border-[var(--ms-border)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
                style={{ scrollSnapAlign: "start" }}
              >
                <img src={p.images[0]} alt={p.name} className="h-[160px] w-full object-cover" />
                <div className="p-3">
                  <p className="text-[11px] text-[var(--ms-mauve)]">{p.brand}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-[var(--ms-navy)]">{p.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ms-navy)]">{formatKES(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sticky Add to Cart — mobile */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--ms-border)] bg-white px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {/* Mobile qty */}
          <div className="flex items-center overflow-hidden rounded-[12px] border border-[var(--ms-border)]">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="flex h-9 w-9 items-center justify-center text-[var(--ms-mauve)] disabled:opacity-30"
            >
              <span className="text-lg leading-none">−</span>
            </button>
            <span className="w-7 text-center text-sm font-semibold text-[var(--ms-navy)]">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              disabled={!product.inStock || qty >= product.stockCount}
              className="flex h-9 w-9 items-center justify-center text-[var(--ms-mauve)] disabled:opacity-30"
            >
              <span className="text-lg leading-none">+</span>
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--ms-navy)]">{product.name}</p>
            <p className="text-sm text-[var(--ms-mauve)]">{formatKES(product.price * qty)}</p>
          </div>
          <button
            type="button"
            disabled={!product.inStock}
            onClick={handleAdd}
            className="shrink-0 rounded-full bg-[var(--ms-rose)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {added ? "Added ✓" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
