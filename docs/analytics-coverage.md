# Analytics coverage

Source audit baseline: 2026-09-29; Craft/When We Meet added 2026-09-30. This report describes authored instrumentation and the static coverage check, not production deployment, successful GA ingestion, or complete browser QA.

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
| `/craft` | Craft project link (`craft_projects` section); Privacy Policy and Terms links (`craft_legal_link`); Craft account sign-in and account-check retry (`craft_account`). |
| `/craft/when-we-meet` | Back link, guest sign-in and create entry, owned-meeting links without room IDs (`wwm_meetings`); create dialog form, title/name inputs, date range, time range/all-day, timezone picker/search/options, cancel/submit (`wwm_create`); invitation-link copy/done. |
| `/craft/when-we-meet/[roomId]` | Invitation landing name/join/sign-in (`wwm_invitation`); share, settings form, room tabs with the constant tab key as ID, availability cells and saved-response bars, compact toggle, calendar fill/apply/dismiss/connect, save and section retries (`wwm_room`); people retry (`wwm_people`); confirmation cells, date/time pickers, review, recipient checkboxes, calendar connect, back/send, check-again and event link (`wwm_confirm`). |
| `/craft/when-we-meet/auth/callback` | OAuth return link after a failed exchange (`wwm_auth`). |
| `/craft/privacy` | Contact mailto link, Google policy and permissions external links, links to Craft and Terms (`craft_legal`). |
| `/craft/terms` | Contact mailto link and links to Craft and Privacy Policy (`craft_legal`). |
| `/craft/[...missing]` | Unmatched Craft URL → Craft 404 (`craft/not-found.tsx`, English): Back to Craft link (`home_link`); Craft route errors (`craft/error.tsx`) add Try again (`retry`) (`error`). |

Craft labels are fixed UI names from `ANALYTICS_ELEMENTS`; names, emails, meeting titles and room IDs are never attached as labels or `data-analytics-id`. Explicit labels also stop the tracker from falling back to `aria-label`/text content, which in When We Meet contains participant names and meeting titles. Link URLs and `page_location` still carry the room path, as for every route. The error boundaries (`src/app/error.tsx`, `src/app/global-error.tsx`) and the 404 page render `SiteError`; their retry and home controls are labelled in the `error` section.

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
- Shared primitives that spread caller props carry a constant default that call sites override: `WallBackLink` (`back_link`, overridden by `post_back` on articles) and the shadcn `Input` (`text_input`, overridden by field-specific labels).
- Storybook stories and fixtures under `src/stories/` (and any `*.stories.*`) are excluded. They are development scaffolding, not shipped product UI; the product components they render are scanned in their own files.
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
- Command search on `/2025`: result rows render as anchors; Enter generates one result click, with result count and position, and reaches the article. Results use ThemedLink so an English UI does not introduce the unsupported /en route prefix.
- Gallery: opening a photo emits one click and one `gallery_view`; next emits one click and a view for the next source; closing emits one click.

Browser checks inspect the client `dataLayer`. They do not establish GA server receipt or production deployment.
