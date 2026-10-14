# Phase 5 data provenance classification

## Discovery

- Service categories and service summaries shown in `app/discover/page.tsx`: static catalogue/example data.
- Provider cards inside Discover: static catalogue/example data loaded from `lib/site-data.ts`.
- Look cards: static catalogue/example data from `lib/looks-data.ts`.

## Professional profiles

- `/professionals/[slug]`: static catalogue/example data.
- No provider is presented as a verified registered professional, published portfolio, or available appointment.
- No ratings, credentials, reviews, portfolio ownership, staff or availability are displayed when unsupported.

## Salon profiles

- `/salons/[slug]`: static catalogue/example data.
- No opening hours, amenities, staff membership, reviews, service availability or evidence of a registered business are invented.

## Service comparison

- `/service-comparison`: static catalogue/example data only.
- Prices and durations shown are catalogue summaries only.
- No live availability, confirmed prices, provider verification, or booking commitments are represented.

## Unknown or unverified data

- Provider records that do not map to the supported static slugs render an honest unavailable state.
- Placeholder images use the neutral "Image in progress" SVG.
- No genuine registered marketplace records are currently verified by Next.js routes in this branch.
