import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Open-Source Licenses — Mobile Salon",
  description: "Third-party open-source libraries used by Mobile Salon and their respective licenses.",
};

interface LibEntry {
  name: string;
  version: string;
  license: string;
  description: string;
  url: string;
}

const LIBS: LibEntry[] = [
  {
    name: "Next.js",
    version: "16.2.4",
    license: "MIT",
    description: "The React framework for production — server-side rendering, routing, and build tooling.",
    url: "https://github.com/vercel/next.js",
  },
  {
    name: "React",
    version: "19.2.4",
    license: "MIT",
    description: "A JavaScript library for building user interfaces.",
    url: "https://github.com/facebook/react",
  },
  {
    name: "react-dom",
    version: "19.2.4",
    license: "MIT",
    description: "React package for working with the DOM.",
    url: "https://github.com/facebook/react",
  },
  {
    name: "Tailwind CSS",
    version: "4.x",
    license: "MIT",
    description: "A utility-first CSS framework for rapidly building custom designs.",
    url: "https://github.com/tailwindlabs/tailwindcss",
  },
  {
    name: "lucide-react",
    version: "1.8.0",
    license: "ISC",
    description: "Beautiful and consistent icon toolkit made by the community.",
    url: "https://github.com/lucide-icons/lucide",
  },
  {
    name: "framer-motion",
    version: "12.x",
    license: "MIT",
    description: "An open-source motion library for React, powering animations and gestures.",
    url: "https://github.com/framer/motion",
  },
  {
    name: "clsx",
    version: "2.x",
    license: "MIT",
    description: "A tiny utility for constructing className strings conditionally.",
    url: "https://github.com/lukeed/clsx",
  },
  {
    name: "tailwind-merge",
    version: "3.x",
    license: "MIT",
    description: "Utility to efficiently merge Tailwind CSS classes without style conflicts.",
    url: "https://github.com/dcastil/tailwind-merge",
  },
  {
    name: "class-variance-authority",
    version: "0.7.x",
    license: "Apache-2.0",
    description: "Creating variants with the power of Tailwind CSS and TypeScript.",
    url: "https://github.com/joe-bell/cva",
  },
  {
    name: "zustand",
    version: "5.x",
    license: "MIT",
    description: "A small, fast, and scalable bearbones state management solution.",
    url: "https://github.com/pmndrs/zustand",
  },
  {
    name: "TypeScript",
    version: "5.x",
    license: "Apache-2.0",
    description: "TypeScript is a language for application-scale JavaScript.",
    url: "https://github.com/microsoft/TypeScript",
  },
];

const LICENSE_COLORS: Record<string, string> = {
  MIT:          "bg-emerald-50 text-emerald-700",
  ISC:          "bg-blue-50 text-blue-700",
  "Apache-2.0": "bg-amber-50 text-amber-700",
};

export default function LicensesPage() {
  return (
    <main className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-10 text-[var(--ms-charcoal)]">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 overflow-hidden rounded-[32px] bg-[var(--ms-plum)] px-8 py-10 text-white shadow-[0_24px_80px_rgba(58,24,58,0.3)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Legal</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">Open-Source Licenses</h1>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Mobile Salon is built on the shoulders of these open-source projects.
            We are grateful to their authors and contributors.
          </p>
        </div>

        {/* Library list */}
        <div className="space-y-3">
          {LIBS.map((lib) => (
            <div
              key={lib.name}
              className="rounded-[20px] border border-[var(--ms-border)] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(13,27,42,0.05)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-[var(--ms-navy)]">{lib.name}</p>
                    <span className="text-[12px] text-[var(--ms-mauve)]">v{lib.version}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-[var(--ms-mauve)]">{lib.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${LICENSE_COLORS[lib.license] ?? "bg-[var(--ms-soft-bg)] text-[var(--ms-mauve)]"}`}
                >
                  {lib.license}
                </span>
              </div>
              <a
                href={lib.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-[12px] text-[var(--ms-rose)] underline hover:text-[var(--ms-plum)]"
              >
                {lib.url.replace("https://", "")}
              </a>
            </div>
          ))}
        </div>

        {/* MIT license text */}
        <div className="mt-8 rounded-[24px] border border-[var(--ms-border)] bg-white px-6 py-6 shadow-[0_1px_4px_rgba(13,27,42,0.05)]">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ms-mauve)]">
            MIT License (standard text)
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-[14px] bg-[var(--ms-soft-bg)] p-4 text-[12px] leading-5 text-[var(--ms-charcoal)]">
{`Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
          </pre>
        </div>

        {/* Back nav */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ms-mauve)] transition hover:border-[var(--ms-rose)] hover:text-[var(--ms-navy)]"
          >
            ← Back to Settings
          </Link>
          <p className="text-xs text-[var(--ms-mauve)]">Mobile Salon Limited · Kenya</p>
        </div>
      </div>
    </main>
  );
}
