# Analytics coverage

Source audit baseline: 2026-09-29. This report describes authored instrumentation and the static coverage check, not production deployment, successful GA ingestion, or complete browser QA.

## Route families

The inventory comes from `src/app/**/page.tsx`. The global tracker supplies page path, page family, design and device/environment context. Shared controls are included wherever their layouts render them. Individual event names, actions, elements and sections live in `src/constants/analytics.ts`.

| Authored routes | Page controls and shared instrumentation |
| --- | --- |
| `/`, `/personal`, `/2025/light` | Light-wall post list and post navigation, search entry/input/clear/results/close, menu links and dismissal, wordmark, color mode. The personal page reuses the filtered post-list surface. |
| `/2025`, `/2025/personal` | Legacy post cards/thumbnail navigation, search, dock menu/navigation/color mode, home link. |
| `/2026`, `/2026/personal` | Cloud post cards, design-story link, footer links, shared navigation/search/design/color controls as rendered by the layout. |
| `/[slug]` | Top/end back links and article interaction classification; wall header/menu/color controls. |
| `/2025/[slug]`, `/2026/[slug]` | Shared legacy article renderer and article interaction classification; shared layout controls. |
| `/about`, `/2025/about`, `/2026/about` | Email, GitHub and coffee-chat contact links; project GitHub/website links with individual IDs and contact/project sections. |
| `/gallery`, `/2025/gallery`, `/2026/gallery` | Photo thumbnails, viewer previous/next/close/backdrop, location link and retry. Native button activation is recorded as a click; swipe navigation is recorded through interaction actions. |
| `/designs` | Every design selection with its design ID, design-story link, wall controls. |
| `/about-design` | Sweet-home design story and design-picker link; wall controls. |
| `/2025/about-design`, `/2026/about-design` | Both routes currently export the Cloud design-story component: home and design-archive links. |
| `/resume`, `/2025/resume`, `/2026/resume` | Server redirects to `/about`, `/2025/about`, `/2026/about` respectively. The destination page is tracked; the redirect has no clickable UI of its own. |

Additional retained components are instrumented even where no current route directly renders them: the standalone resume component, portfolio hero/contact/selected-work sections and legacy design archive. Their labels are checked by the same source scan.

Search additionally emits `search_results` after a nonempty query settles, with `query_length`, `result_count` and `has_results`; the query text is not sent. Clicking a result flushes a pending report before navigation. Result clicks carry their post ID and position, and command search uses a full-row anchor for pointer and Enter-key activation.

Gallery opening and image changes emit `gallery_view` with the public static image source as `content_id`. Thumbnail and viewer controls use the same image source for stable identification instead of array position. Native media actions and article image-viewer actions use centralized action constants.

## Authored controls and dynamic content

`scripts/analytics-coverage.test.mjs` uses the TypeScript AST across `src` to check:

- Anchors, Next/Themed links, buttons including motion buttons, input/textarea/select, summary/form, controlled native media and command input/result primitives.
- Every other authored `onClick` or `onClickCapture` root that performs an action.
- Constant element labels, centralized event/action names, and this report's route inventory.

The finite exceptions are deliberately narrow:

- `ThemedLink` forwards data attributes through `...props` to Next Link. Its call sites still require labels. `ThumbnailTransition` labels its own rendered ThemedLink and attaches the post ID, so post-card callers do not need duplicate listeners.
- The Dock's nested `MenuIcon` has an exact instrumented menu-button ancestor, and its underlying DOM implementation is scanned separately. Menu/Search icon labels may be absent only when the icon is decorative and the enclosing control owns the action.
- A nonsemantic handler containing only `event.stopPropagation()` is a propagation blocker, not a distinct action. Adding any other statement removes that exception.
- The command search root has one capture handler that only reports result counts when an already labeled result is clicked. Its exact conditional/report-only AST shape is checked; it does not represent an additional clickable control.

Third-party Notion-rendered links, toggles, code-copy buttons, image viewer controls, embeds and native media appear at runtime rather than as authored JSX in this repository. The tracker classifies those through the article/Notion DOM delegation rules. These are outside the AST coverage count and need separate runtime checks with representative content.

Browser security prevents inspecting interactions _inside cross-origin iframes_, including third-party players and embedded PDFs. The page can record an exposed embed/open control; internal iframe clicks cannot be claimed as covered without a provider integration. Decorative movement, hover animation and disabled controls are not independent user actions.

## Verification

Run the source guard with:

```sh
node --test scripts/analytics-coverage.test.mjs
```

Its diagnostic reports the current number of instrumented roots and narrow exceptions. This establishes source coverage only. Browser event generation, network delivery, GA receipt and production deployment remain separate evidence and must be verified separately.

### Local verification on 2026-09-29

- Analytics unit and source coverage checks: 13 passed; TypeScript passed. Changed TypeScript files pass ESLint with three existing Dock declaration-order warnings.
- Aside Browser: `/resume` redirects to `/about`; all seven contact/project links have section and per-link IDs.
- Wall search: a query with one result emits one `search_results`; selecting it records its post ID and position 1.
- Command search on `/2025`: result rows render as anchors; Enter generates one result click, with result count and position.
- Gallery: opening a photo emits one click and one `gallery_view`; next emits one click and a view for the next source; closing emits one click.

Browser checks inspect the client `dataLayer`. They do not establish GA server receipt or production deployment.
