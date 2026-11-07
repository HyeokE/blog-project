# Shade catalog and matching

Catalog rows live in Supabase. JSON/CSV/XLSX files, catalog snapshots, and SQL seeds are not stored in this repository. Brands, products and shades use database-generated UUIDs. Imports use private hashes for idempotent upserts and preserve existing UUIDs.

To prepare another import, supply explicit paths outside this repository. The scripts reject paths that resolve into the checkout, including symlinks:

```sh
node scripts/import-shade-catalog.mjs /external/shade-catalog-raw.json /external/shade-finder-catalog.json
node --test scripts/shade-matching.test.mjs
# Start the local app first, then exercise the actual Route Handlers:
SHADE_FINDER_TEST_URL=http://localhost:3001 node --test scripts/shade-api.test.mjs
```

Matching uses each shade's canonical six-digit `hex` color code (for example, `#e5bda0`) as its input, decodes it as sRGB, and ranks by CIEDE2000 after conversion to D50 CIELAB. External import inputs may contain legacy `rgb` fields; matching uses the canonical HEX value. It returns the closest shade from each other product; unrounded distance and stable IDs determine order. Type and brand filters apply to candidate products. No percentage, purchase suitability or real-world skin-match confidence is inferred. HEX similarity cannot account for skin, lighting, opacity or oxidation.

`server.ts` is guarded by `server-only` and delegates all runtime reads to the typed Supabase repository. Neither the application nor its tests depend on a repository catalog file. The initial bootstrap request returns only brand display options and one example selection to the client. Same-origin Route Handlers return products for one selected brand, shades for one selected product, or six recommendation results at a time. Explicit DTO mappers return only the display fields required by each view. Unknown query parameters, malformed identifiers, invalid filters and offsets are rejected; callers cannot raise the fixed result page size. This minimizes what is sent to the browser: the names and hex codes needed to draw the interface still remain inspectable in normal network responses. It is not a confidentiality or anti-scraping guarantee.

Color conversion follows [W3C CSS Color 4](https://www.w3.org/TR/css-color-4/#color-conversion-code). CIEDE2000 follows the equations described by [Sharma, Wu and Dalal](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/). Tests cover all 34 published reference pairs in both directions, D50 conversion anchors, canonical hex precedence even when legacy RGB disagrees, catalog integrity, duplicate handling, nearest-shade selection, exclusions, filters and deterministic ties. The local HTTP suite checks the actual response allowlists, pagination, rejected queries, and absence of the catalog from the initial page.

The interface displays a five-step difference scale: below 1 ΔE is step 1, 1–2 is step 2, 2–3 is step 3, 3–5 is step 4, and 5 or above is step 5 (upper bounds exclusive). A visible legend explains all ranges; each result marks its current step and shows the numeric comparison value. Display bands use two-decimal precision to stay consistent at rounded boundaries; ranking always uses unrounded distance. These are application display bands, not universal perception thresholds or cosmetic-match claims.

This route uses a neutral near-white canvas and white cards, regardless of the saved site theme. Route-scoped Craft tokens also cover portals and the shared header; leaving the route restores the existing theme without changing preferences.

## Supabase storage

The Shade Finder migrations define normalized brands, products, shades, and import bookkeeping in `shade_finder_private`. Do **not** add that schema to PostgREST's exposed schemas. Public `SECURITY INVOKER` functions return the brand list, one brand's products, one product's shades, or six nearest matches. Runtime `anon` and `authenticated` callers have read-only RLS policies and column grants that exclude `source_key` and import checksums; they cannot write catalog rows or read import bookkeeping. App requests use the existing cookie-aware Supabase client and the caller's session, never a service-role key.

`database.types.ts` was generated with Supabase CLI from an isolated PostgreSQL database with all Shade Finder migrations applied. `public-types.ts` derives its product enum from that generated schema. `data-access.ts` uses typed RPC calls; `normalize.ts` is the only DB row-to-app conversion boundary. `public-contracts.ts` validates runtime responses on both sides of the API, including nested objects, HEX values, product types, finite scores, and bounded pages. The browser no longer trusts a generic JSON type assertion.

All four same-origin Route Handlers now read Supabase, with no JSON fallback. The schema-generated types cover every RPC call, and runtime validators reject malformed API responses before rendering. Initial reads use a real Suspense resource in the client data region; the header remains rendered while geometry-matched skeletons cover pending content. Errors use the shared retry boundary.

For subsequent imports, validate the full catalog and use an explicitly supplied administrative connection. Do not reuse `WWM_CALENDAR_DATABASE_URL`, which belongs to another least-privilege runtime role. The importer validates before opening a connection, applies parameterized upserts in a transaction, and performs no deletes. The complete SQL export may exceed the dashboard editor's size limit; prefer the direct importer. Runtime requests never use this administrative connection.

```sh
# Review a validated, atomic SQL seed without accessing any database:
node scripts/import-shade-supabase.mjs --catalog /external/shade-finder-catalog.json --dry-run --output /external/shade-finder-seed.sql

# SHADE_IMPORT_DATABASE_URL must already be supplied securely by the operator.
node scripts/import-shade-supabase.mjs --catalog /external/shade-finder-catalog.json --apply

# Generate types from a database with all Shade Finder migrations applied (CLI v3):
npx supabase gen types --lang typescript --remote="$SHADE_IMPORT_DATABASE_URL" \
  --schema public --schema shade_finder_private > /tmp/shade-database.types.ts

# Runtime contracts, import validation, and optional real database/RLS/parity tests:
node --test scripts/shade-contracts.test.mjs scripts/shade-supabase.test.mjs
# Set SHADE_TEST_DATABASE_URL to an isolated PostgreSQL test database to run DB tests.
```

Unit and local database tests generate small synthetic catalogs in memory using invented IDs and names; they do not bundle production rows. SQL CIEDE2000 is checked against all 34 published mathematical reference pairs in both directions and against JavaScript rankings across synthetic filtered/paginated samples. HTTP checks derive selections from the running API. Hosted verification and local mathematical/reference tests are separate checks.

## Relative color explanations

Recommendation cards compare the two displayed HEX codes using the same sRGB-to-D50 Lab conversion as ranking. Lightness uses L*, chroma uses hypot(a*, b*), redness uses a*, and yellowness uses b*. The UI labels chroma as 채도 for readability; this is a chroma-based description, not a physical saturation measurement. Differences below one unit on each axis are grouped as nearly unchanged, an application display rule rather than a validated visibility threshold. Identical HEX codes are labeled equal. These explanations do not change matching order or classify a person's undertone; redness and yellowness remain independent directions because warm/cool naming differs between brands.

## Recommendation search

The result search submits brand, product and recommended shade names through the same-origin matches route (`q`, at most 100 characters). Search runs in Supabase over the nearest shade already selected for each product, before counting and paging; it does not change which shade is that product's nearest match. Whitespace-separated terms must all occur in the combined brand/product/shade labels, case-insensitively. Percent signs and underscores are literal text. Type and brand filters intersect with search, and pagination keeps the query. The UI submits on Enter or the search button so Korean composition does not trigger partial searches.

## Usage analytics

Shade Finder uses the site's GA4 tracker. `shade_action` records selections, picker usage, search submission/reset, filters, the color guide, pagination and retries. `shade_request` records actual API attempts with their outcome, HTTP status, duration and a fixed failure category; cache reads do not create request events. `shade_results` records loaded result counts, including empty results. `shade_impression` records a recommendation once when at least half its card enters the viewport. `shade_exit` records time on the page and the last selection stage on navigation or page hide.

Payloads contain allowlisted public catalog identifiers, labels and colors, numeric comparison values and counts. Search text, full request URLs, response bodies and raw error messages are not sent. Each event carries at most ten feature parameters alongside the shared page/environment fields. Analytics failures do not interrupt the product flow. Local tests use synthetic data and stub delivery; browser verification can inspect `window.dataLayer` before checking the deployed GA4 transport.
