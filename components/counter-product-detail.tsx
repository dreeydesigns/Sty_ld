"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Store,
} from "lucide-react";

// ─── Counter product catalogue (preview only) ──────────────────────────────────
// Counter is not live yet. These listings are illustrative product information
// only. Ordering, payment, delivery, reviews and seller verification are not
// available, so nothing here is presented as purchased, rated or verified.

const PRODUCTS = [
  {
    id: "1",
    name: "Edge Control Gel — Extra Hold",
    brand: "Cantu",
    shopName: "Beauty Base KE",
    price: 850,
    category: "hair",
    description:
      "A firm-hold edge control gel that keeps edges laid for up to 48 hours. Enriched with shea butter and coconut oil to moisturise while you style. No flaking, no white residue. Suitable for all hair types.",
    images: [
      "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
      "https://images.pexels.com/photos/5797991/pexels-photo-5797991.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
      "https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    relatedIds: ["2", "3", "5"],
  },
  {
    id: "2",
    name: "Matte Lip Kit — Nairobi Nude",
    brand: "Zuri Beauty",
    shopName: "Zuri Beauty Official",
    price: 1200,
    category: "accessories",
    description: "A long-wearing matte lip kit designed for deeper skin tones. Includes a lip liner and liquid lipstick in the iconic Nairobi Nude shade — warm, earthy, and universally flattering.",
    images: [
      "https://images.pexels.com/photos/2693644/pexels-photo-2693644.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    relatedIds: ["1", "4"],
  },
  {
    id: "3",
    name: "Natural Hair Moisturiser",
    brand: "Shea Moisture",
    shopName: "NaturalGlow KE",
    price: 1650,
    category: "hair",
    description: "Deep conditioning moisturiser formulated for 4C natural hair. Contains raw shea butter, hibiscus extract, and coconut oil for defined curls and all-day moisture retention.",
    images: [
      "https://images.pexels.com/photos/5797991/pexels-photo-5797991.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    relatedIds: ["1", "6"],
  },
  {
    id: "4",
    name: "Pro Nail Drill Kit — 35W",
    brand: "NailTech Pro",
    shopName: "ProNails KE",
    price: 3200,
    category: "tools",
    description: "Professional-grade nail drill with 35W motor and variable speed control. Includes 6 interchangeable drill bits. Suitable for gel, acrylic, and natural nail care.",
    images: [
      "https://images.pexels.com/photos/3997373/pexels-photo-3997373.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    relatedIds: ["2"],
  },
  {
    id: "5",
    name: "Vitamin C Glow Serum",
    brand: "Radiant Skin Co.",
    shopName: "GlowUp KE",
    price: 2100,
    category: "skincare",
    description: "A brightening serum with 15% stabilised Vitamin C, niacinamide, and hyaluronic acid. Evens skin tone, reduces dark spots, and gives a natural glass-skin glow. Dermatologist-tested for Kenyan skin.",
    images: [
      "https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    relatedIds: ["3", "6"],
  },
  {
    id: "6",
    name: "Rose Quartz Gua Sha Set",
    brand: "SkinRitual",
    shopName: "Wellness Corner KE",
    price: 1400,
    category: "wellness",
    description: "A rose quartz gua sha stone and jade roller combo for facial lymphatic drainage and de-puffing. Includes a how-to guide card. Cool to the touch for an instant de-puffing effect.",
    images: [
      "https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop",
    ],
    relatedIds: ["3", "5"],
  },
];

function formatKES(n: number) {
  return `KES ${n.toLocaleString()}`;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ category, name }: { category: string; name: string }) {
  return (
    <nav className="mb-4 flex items-center gap-2 text-[13px] text-[var(--color-secondary)]">
      <Link href="/counter" className="hover:text-[var(--text-primary)]">Counter</Link>
      <span className="opacity-40">›</span>
      <Link href={`/counter?category=${category}`} className="capitalize hover:text-[var(--text-primary)]">{category}</Link>
      <span className="opacity-40">›</span>
      <span className="truncate font-semibold text-[var(--text-primary)]">{name}</span>
    </nav>
  );
}

// ─── Counter Product Detail ───────────────────────────────────────────────────

export function CounterProductDetail({ productId }: { productId: string }) {
  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0];
  const related = PRODUCTS.filter((p) => product.relatedIds.includes(p.id));

  const [activeImage, setActiveImage] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [reported, setReported] = useState(false);

  function handleReport() {
    setReported(true);
    setTimeout(() => setReported(false), 3000);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4">
      <Breadcrumb category={product.category} name={product.name} />

      {/* Main layout */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">

        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-[24px] bg-[var(--surface-card)]">
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className="h-full w-full object-cover transition-all duration-300"
            />
            {/* Mobile swipe arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImage((i) => (i - 1 + product.images.length) % product.images.length)}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--text-primary)] shadow lg:hidden"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((i) => (i + 1) % product.images.length)}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--text-primary)] shadow lg:hidden"
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
                      ? "border-[var(--color-secondary)] shadow-[0_0_0_3px_rgba(214,51,108,0.15)]"
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
          <p className="text-[13px] text-[var(--color-secondary)]">{product.brand}</p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{product.name}</h1>

          {/* Seller */}
          <div className="flex items-center gap-2 text-sm text-[var(--color-secondary)]">
            <Store className="h-4 w-4" />
            <span>{product.shopName}</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <p className="text-[28px] font-semibold text-[var(--text-primary)]">{formatKES(product.price)}</p>
          </div>

          {/* Description */}
          <div>
            <p className={`text-sm leading-7 text-[var(--text-secondary)] ${!showFullDesc ? "line-clamp-4" : ""}`}>
              {product.description}
            </p>
            <button
              type="button"
              onClick={() => setShowFullDesc((v) => !v)}
              className="mt-1 text-xs font-semibold text-[var(--color-accent)] underline underline-offset-2"
            >
              {showFullDesc ? "Show less" : "Read more"}
            </button>
          </div>

          {/* Ordering unavailable */}
          <div className="space-y-3">
            <button
              type="button"
              disabled
              className="w-full rounded-[16px] bg-[var(--color-accent)] py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ordering coming soon
            </button>
            <p className="text-[11px] text-center text-[var(--color-secondary)]">
              Counter is not live yet. Ordering, payment and delivery are not available.
            </p>
            <div className="flex items-start gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-secondary)]" />
              <p className="text-[11px] leading-4 text-[var(--color-secondary)]">
                Expect the real thing.{" "}
                <button type="button" onClick={handleReport} className="text-[var(--color-accent)] underline">{reported ? "Report sent ✓" : "Report this product"}</button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-10 space-y-4">
        <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Reviews</h2>
        <p className="rounded-[14px] bg-[var(--surface-card)] px-4 py-6 text-sm text-[var(--color-secondary)]">
          Reviews are not available yet. We only show reviews from confirmed purchases, and Counter ordering is not live.
        </p>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Similar products</h2>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/counter/product/${p.id}`}
                className="w-[260px] shrink-0 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
                style={{ scrollSnapAlign: "start" }}
              >
                <img src={p.images[0]} alt={p.name} className="h-[160px] w-full object-cover" />
                <div className="p-3">
                  <p className="text-[11px] text-[var(--color-secondary)]">{p.brand}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{p.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatKES(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
