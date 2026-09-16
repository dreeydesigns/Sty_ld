import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * P0A test harness.
 *
 * `@/*` resolves to the repository root, mirroring the `paths` mapping in
 * tsconfig.json (this repo keeps sources at the root, not under src/).
 * Node environment: the P0A suites cover pure policy modules (roles, booking
 * state, rate limiting) — no DOM required.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: "default",
  },
});
