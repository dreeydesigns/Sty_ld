"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { salons, professionals, services } from "@/lib/site-data";
import {
  buildProfessionalComparisonItems,
  buildSalonComparisonItems,
  canCompare,
  durationLabel,
  mergeSelection,
  priceLabel,
  removeSelection,
} from "@/lib/service-comparison.cjs";

export default function ServiceComparisonPage() {
  const items = useMemo(
    () => [...buildProfessionalComparisonItems(professionals, services), ...buildSalonComparisonItems(salons, services)].slice(0, 24),
    []
  );
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => items.slice(0, 2).map((item) => item.key));
  const selected = selectedKeys.map((key) => items.find((item) => item.key === key)).filter(Boolean);

  return (
    <AppShell currentNav="discover">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/discover" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Back to Discover</Link>
        <header className="mt-4 rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-clay-text)]">Service comparison</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none">Compare catalogue services</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            The static STYLD catalogue provides two or more offers below for interface demonstration. Values are not represented as verified live pricing, availability or provider credentials.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedKeys([])}
              className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
            >
              Clear comparison
            </button>
            <p className="self-center text-xs text-[var(--text-secondary)]">{allowedLabel(selectedKeys.length)}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
            <h2 className="font-semibold">Choose services</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Select two to four offers.</p>
            <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">
              {items.map((item) => {
                const checked = selectedKeys.includes(item.key);
                return (
                  <label key={item.key} className={cn("flex cursor-pointer gap-3 rounded-2xl border p-3 text-sm transition", checked ? "border-[var(--color-clay)] bg-[var(--bg-surface-raised)]" : "border-[var(--border-subtle)] hover:border-[var(--color-clay)]")}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedKeys((previous) =>
                          checked ? removeSelection(previous, item.key) : mergeSelection(previous, item.key)
                        );
                      }}
                      className="mt-1 h-4 w-4"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[var(--text-primary)]">{item.service.name}</span>
                      <span className="block truncate text-xs text-[var(--text-secondary)]">{item.providerName}</span>
                      <span className="block text-xs text-[var(--text-muted)]">{priceLabel(item.service)} · {durationLabel(item.service)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="sm:hidden space-y-4">
            {selected.length < 2 ? (
              <div className="rounded-2xl bg-[var(--bg-surface-raised)] p-4 text-sm text-[var(--text-secondary)]">Select at least two services to compare attributes.</div>
            ) : (
              selected.map((item) => (
                <article key={item!.key} className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-4">
                  <h3 className="font-semibold text-[var(--text-primary)]">{item!.service.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{item!.providerName} ({item!.providerType})</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex gap-3 border-t border-[var(--border-subtle)] pt-2"><dt className="w-24 shrink-0 text-xs font-bold uppercase text-[var(--text-muted)]">Price</dt><dd className="text-[var(--text-secondary)]">{priceLabel(item!.service)}</dd></div>
                    <div className="flex gap-3 border-t border-[var(--border-subtle)] pt-2"><dt className="w-24 shrink-0 text-xs font-bold uppercase text-[var(--text-muted)]">Duration</dt><dd className="text-[var(--text-secondary)]">{durationLabel(item!.service)}</dd></div>
                    <div className="flex gap-3 border-t border-[var(--border-subtle)] pt-2"><dt className="w-24 shrink-0 text-xs font-bold uppercase text-[var(--text-muted)]">Category</dt><dd className="text-[var(--text-secondary)]">{item!.service.category}</dd></div>
                    <div className="flex gap-3 border-t border-[var(--border-subtle)] pt-2"><dt className="w-24 shrink-0 text-xs font-bold uppercase text-[var(--text-muted)]">Description</dt><dd className="text-[var(--text-secondary)]">{item!.service.description}</dd></div>
                  </dl>
                </article>
              ))
            )}
          </div>
          <div className="hidden overflow-x-auto rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 sm:block">
            {selected.length < 2 ? (
              <div className="py-12 text-center">
                <h2 className="font-display text-2xl font-semibold">Need at least two services</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Add another offer to begin a comparison. Attributes that are unavailable are left blank.</p>
              </div>
            ) : (
              <table className="min-w-[620px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Attribute</th>
                    {selected.map((item) => (
                      <th key={item!.key} className="p-3 text-left font-semibold text-[var(--text-primary)]">{item!.service.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AttributeRow label="Provider" values={selected.map((item) => item!.providerName)} />
                  <AttributeRow label="Provider type" values={selected.map((item) => item!.providerType)} />
                  <AttributeRow label="Description" values={selected.map((item) => item!.service.description)} />
                  <AttributeRow label="Price" values={selected.map((item) => priceLabel(item!.service))} />
                  <AttributeRow label="Duration" values={selected.map((item) => durationLabel(item!.service))} />
                  <AttributeRow label="Category" values={selected.map((item) => item!.service.category)} />
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function AttributeRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-t border-[var(--border-subtle)]">
      <th className="p-3 align-top text-left text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</th>
      {values.map((value, index) => (
        <td key={index} className="p-3 align-top text-[var(--text-secondary)]">{value}</td>
      ))}
    </tr>
  );
}

function allowedLabel(count: number): string {
  if (count < 2) return "Select at least two.";
  if (count >= 4) return "Maximum four selected.";
  return `${count} of 4 selected.`;
}
