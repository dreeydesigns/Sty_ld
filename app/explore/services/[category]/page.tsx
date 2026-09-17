"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  Droplets,
  Gem,
  Hand,
  Heart,
  Leaf,
  Scissors,
  Sparkles,
  Waves,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { SalonCard, ProfessionalCard } from "@/components/marketplace-ui";
import { salons, professionals } from "@/lib/site-data";
import { cn } from "@/lib/utils";

// ─── Service categories (mirrored from explore/page.tsx) ─────────────────────

const SERVICE_CATEGORIES = [
  {
    id: "hair",
    name: "Hair",
    icon: Waves,
    color: "var(--color-warning)",
    colorLight: "rgba(201,168,76,0.08)",
    keywords: ["hair", "braid", "braids", "locs", "weave", "relaxer", "wash", "cut", "natural"],
  },
  {
    id: "nails",
    name: "Nails",
    icon: Hand,
    color: "var(--color-secondary)",
    colorLight: "rgba(192,160,144,0.08)",
    keywords: ["nail", "nails", "manicure", "pedicure", "gel", "acrylic"],
  },
  {
    id: "makeup",
    name: "Make-up",
    icon: Sparkles,
    color: "var(--color-warning)",
    colorLight: "rgba(192,160,144,0.08)",
    keywords: ["makeup", "make-up", "lash", "lashes", "glam", "bridal"],
  },
  {
    id: "skincare",
    name: "Skincare",
    icon: Leaf,
    color: "var(--color-success)",
    colorLight: "rgba(144,152,136,0.08)",
    keywords: ["skin", "skincare", "facial", "glow", "acne", "peel"],
  },
  {
    id: "massage",
    name: "Massage",
    icon: Heart,
    color: "var(--color-warning)",
    colorLight: "rgba(201,168,76,0.08)",
    keywords: ["massage", "body", "relaxation", "deep tissue"],
  },
  {
    id: "waxing",
    name: "Waxing",
    icon: Droplets,
    color: "var(--color-warning)",
    colorLight: "rgba(201,168,76,0.06)",
    keywords: ["wax", "waxing", "brow", "brows"],
  },
  {
    id: "threading",
    name: "Threading",
    icon: Scissors,
    color: "var(--color-secondary)",
    colorLight: "rgba(192,160,144,0.06)",
    keywords: ["thread", "threading", "brow", "brows"],
  },
  {
    id: "wellness",
    name: "Wellness",
    icon: Leaf,
    color: "var(--color-success)",
    colorLight: "rgba(144,152,136,0.06)",
    keywords: ["wellness", "body wrap", "steam", "hot oil"],
  },
  {
    id: "bridal",
    name: "Bridal",
    icon: Gem,
    color: "var(--color-warning)",
    colorLight: "rgba(201,168,76,0.06)",
    keywords: ["bridal", "bride", "wedding"],
  },
  {
    id: "locs-braids",
    name: "Locs & Braids",
    icon: Waves,
    color: "var(--color-warning)",
    colorLight: "rgba(201,168,76,0.06)",
    keywords: ["locs", "braids", "braid", "cornrow", "fulani"],
  },
];

export default function ServiceCategoryPage() {
  const params = useParams();
  const categoryId = params.category as string;

  const category = SERVICE_CATEGORIES.find((c) => c.id === categoryId);
  const [providerType, setProviderType] = useState<"salons" | "professionals">("salons");

  // Filter salons by categoryTags matching any keyword
  const filteredSalons = salons.filter((salon) =>
    category?.keywords.some((kw) =>
      salon.categoryTags.some((tag) => tag.toLowerCase().includes(kw))
    )
  );
  const displaySalons = (filteredSalons.length > 0 ? filteredSalons : salons).slice(0, 6);

  // Filter professionals by specialty matching any keyword
  const filteredPros = professionals.filter((pro) =>
    category?.keywords.some((kw) =>
      pro.specialty.toLowerCase().includes(kw)
    )
  );
  const displayPros = (filteredPros.length > 0 ? filteredPros : professionals).slice(0, 6);

  const Icon = category?.icon;

  return (
    <AppShell currentNav="explore" roleMode="salons">
      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-4">

        {/* Back link */}
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--text-primary)] transition"
        >
          ← Explore
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4">
          {Icon && category && (
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: category.colorLight, color: category.color }}
            >
              <Icon className="h-7 w-7" />
            </span>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              {category?.name ?? categoryId}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-secondary)]">
              Find {category?.name.toLowerCase() ?? categoryId} specialists near you
            </p>
          </div>
        </div>

        {/* Provider type toggle */}
        <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1">
          <button
            type="button"
            onClick={() => setProviderType("salons")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              providerType === "salons"
                ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            Salons
          </button>
          <button
            type="button"
            onClick={() => setProviderType("professionals")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              providerType === "professionals"
                ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            Professionals
          </button>
        </div>

        {/* Results grid */}
        {providerType === "salons" ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displaySalons.map((salon) => (
              <SalonCard key={salon.slug} salon={salon} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayPros.map((pro) => (
              <ProfessionalCard key={pro.slug} professional={pro} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
