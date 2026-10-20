# STYLD theming and Beauty Worlds

## A. System overview

STYLD personalization is an atmosphere system, not a separate brand system. Every client keeps the same STYLD identity, accessibility standards, navigation, pricing, search and account controls. A beauty world changes supporting colour, surface tone, heading treatment, glass tint, focus colour, selection colour and decorative ambience.

Pure is the default and neutral baseline. It uses the original STYLD palette and adds no ambient layer. The five personalized worlds add supporting tokens only. `data-theme` remains light for all worlds, so readable contrast and the official logo stay intact.

The world is stored in the active client workspace profile as `theme`. Intensity is stored as `worldIntensity`. Both are saved through `PATCH /api/users/me` and restored from `GET /api/me`.

## B. Registered worlds

| Persistent key | Display name | Short name | Badge | Personality |
|---|---|---|---|---|
| `not_set` | Pure | Pure | Finding your world | The original STYLD calm |
| `feminine` | The Romantic | Romantic | The Romantic | Soft, polished, quietly expressive |
| `natural` | The Earth Woman | Earth | The Earth Woman | Grounded, healthy, skin first |
| `spiritual` | The Seeker | Seeker | The Seeker | Calm, restorative, quietly luminous |
| `cultural` | The Daughter of the Soil | Soil | The Daughter of the Soil | Rooted, expressive, heritage proud |
| `african_nude` | The Muse | Muse | The Muse | Minimal, warm, quietly confident |

Legacy five-world keys remain valid. `default` is the runtime world key for Pure. `not_set` is the persisted profile value for Pure.

## C. Brand constants

Fixed properties:

- Deep Ink `#1D1D1B`
- Clay `#C0A090`
- Sage `#909888`
- White `#FFFFFF`
- DM Sans for interface text
- Playfair Display for editorial headings
- The official STYLD S-mark and wordmark in `components/styld-logo.tsx`

Personalized properties:

- `--world-accent`
- `--world-accent-strong`
- `--world-accent-soft`
- `--world-accent-fill`
- `--world-accent-foreground`
- `--world-ink`
- `--world-page`
- `--world-raised`
- `--world-panel`
- `--world-border`
- `--world-header`
- `--world-focus`
- `--world-link`
- `--world-selection`
- `--world-glass-*`
- `--world-wash`
- `--world-heading-family`
- `--world-heading-style`
- `--world-ambient-*`
- `--world-motion-scale`

Worlds must never replace the official logo, change the primary action colour, or alter booking, payment, authentication or account controls.

## D. Semantic design tokens

Token families:

- Accents and buttons: `--world-accent`, `--world-accent-strong`, `--world-accent-soft`, `--world-accent-fill`, `--world-accent-foreground`
- Links and focus: `--world-link`, `--world-focus`
- Selected states: `--world-selection`
- Navigation: `--world-header`, `--world-border`
- Surfaces: `--world-page`, `--world-raised`, `--world-panel`, `--world-ink`
- Glassmorphism: `--world-glass-tint`, `--world-glass-border`, `--world-glass-shadow`
- Ambient layers: `--world-ambient`, `--world-ambient-color`, `--world-ambient-opacity`, `--world-ambient-speed`
- Animation intensity: `--world-motion-scale`
- Borders and panels: `--world-border`, `--world-panel`, `--world-glass-border`

Use the shared classes `bw-surface`, `bw-cover`, `bw-heading` and `bw-chip` instead of duplicating colours. Use `var(--world-*)` in component styles when a direct token is required.

## E. Theme application

`data-world` is the authoritative root attribute. `data-intensity` is the authoritative intensity attribute. `data-beauty-world` is a compatibility bridge only.

Theme application is client only and client-workspace only:

- Guests receive no world.
- Professional, Salon and Admin workspaces receive no client world.
- Account and workspace switches clear the previous client world.
- Pure maps to `not_set` and removes ambient particles.
- Failed saves restore the previous profile and show an honest error.

Session hydration uses `GET /api/me`, then writes the verified session. The client applies the world only after session verification. The session cache mirrors the server response; it is not the source of truth.

Intensity supports `calm`, `balanced` and `immersive`. Pure ignores intensity for ambience.

## F. How to create a new world

1. Add a stable key to `BEAUTY_WORLD_KEYS` in `lib/beauty-world.ts`.
2. Add a complete `WorldDefinition` in `WORLDS`.
3. Add the matching `ThemeKey` and `themeConfigs` entry in `lib/personalization.ts`.
4. Add CSS variables in `app/globals.css` under `:root[data-world="key"]`.
5. Add ambient settings and CSS ambient selectors if motion is required.
6. Add recommendation keywords, categories and services to the registry.
7. Add preview copy in `WORLD_PREVIEW_COPY`.
8. Update `docs/theming.md` and tests.
9. Verify all six or more worlds and three intensities in browser QA.

Do not create a separate component implementation for each world. Consume semantic tokens.

## G. How to create a world-aware component

Use semantic tokens and shared classes:

```tsx
<section className="beauty-card bw-surface rounded-[24px] p-4">
  <h2 className="bw-heading text-2xl font-semibold text-[var(--text-primary)]">
    Title
  </h2>
  <button className="min-h-11 rounded-full bg-[var(--color-action-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-action-primary-text)]">
    Action
  </button>
</section>
```

Avoid hardcoded world colours, world-specific component branches and world-specific routes. The root attribute carries the active world.

## H. Performance and accessibility

- Reduced motion removes ambient animation and particle movement.
- Data Saver suppresses decorative ambience.
- Glass uses CSS-first `backdrop-filter` with a solid fallback.
- Mobile reduces particle counts.
- High contrast and print media disable decorative ambience.
- Focus outlines use `--world-focus`.
- Selected states use `--world-accent-fill` with `--world-accent-foreground`.
- Text contrast must remain at least WCAG AA.
- Ambient elements should stay within the agreed element budget.

## I. Pre-release checklist

Verify:

- Pure, Feminine, Natural, Spiritual, Cultural and African Nude
- Calm, Balanced and Immersive where atmosphere applies
- Desktop and mobile viewports
- No horizontal overflow
- No clipped dialog controls
- Focus visibility
- Reduced motion
- Data Saver
- Guest, Professional and Salon isolation
- Failed save rollback
- Plan draft persistence
- Disabled booking and payment flags

## J. Known limitations

- Authenticated persistence browser testing requires an authorized client test account or an approved isolated sign-in path.
- `BETTER_AUTH_URL` sign-in return remains unresolved until the founder confirms base URL or allowed hosts on the test host.
- Lighthouse and CLS measurements are recorded only when a reliable measurement environment is available. Do not invent scores.
- Real network Data Saver behaviour should be checked on a physical device when available.
