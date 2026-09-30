# Craft design system and migration status (2026-09-30)

Official basis: https://ui.shadcn.com/docs/installation/next , https://ui.shadcn.com/docs/components-json , https://ui.shadcn.com/docs/theming . This is an **existing** Next 16.3.6 / React 19 / Tailwind 4 project. `components.json` points at the existing global stylesheet and `@/*` aliases; generated shadcn Radix primitives live in `src/components/ui/`. Craft-only tokens in `src/app/craft/design-system.css` preserve SUIT/Pretendard, warm ink/surfaces and four-pixel bounded corners. The round profile image remains round. The homepage is not being restyled.

## Information hierarchy / purpose

| Surface | User task and primary information | Primary action | Secondary / state |
|---|---|---|---|
| `/craft` | Discover services, scan short service name/description | Enter When We Meet | Site backlink; no invented counters |
| When We Meet home | Find **own** meetings; authenticated ownership matters | Open meeting or create a new one | Returning-user Google login; owned-list pending/error/empty |
| Creation | Enter meeting title, contiguous max-14-day range, half-hour time window, timezone and name | Explicit Create room | Google login only after valid draft; range Apply/Cancel, no auto-create |
| Room identity | Title, date range and timezone directly beneath | Save changed selection when applicable | Invite participants by a compact header action (pending); no bottom share essay |
| My time | Editable availability grid and bounded date navigator | Select slots / save | Unsaved count and status outside tab, preserved through switches |
| Overlap | Saved participant responses and common availability | Compare windows | No editing controls as tab-purpose copy |
| Recommendations | Ranked saved-only time slots and respondent basis | Choose a viable time | Empty case when no saved overlap |
| Participants (pending) | Actual joined members including those without a response | Inspect membership | Current RLS exposes only **self** in `wwm_members`; no honest roster without reviewed policy/API change |

Loading rule (project-wide decision): initial async reads must use real Suspense-backed queries + shared ErrorBoundary and geometry-matched skeletons; no artificial page gating or skeleton on mutations. This migration is **not completed** for the existing client-side `useEffect` Supabase reads. Another project-wide decision: application Supabase data requests must move to same-origin Next.js server APIs authenticated as the user under RLS. Existing `src/features/when-we-meet/api.ts` and `CraftAccount.tsx` still call browser Supabase directly; a PKCE cookie-session transition requires architectural work and live OAuth regression before declaring compliance. No service-role bypass.

Shared `RollingNumber` lives in `src/components/craft/`, for finite integer quantitative counts only. SSR text must be the current value; visual digits are hidden from assistive technology, no aria-live per grid cell. Intentionally **do not** roll dates, times, calendar day numbers, IDs, static sequence labels or input values. Reduced motion must show the final digit without scrolling. Initial dense grid mount should not animate every count.

Health: root `SupabaseHealthOnce` calls same-origin `GET /api/health/supabase` once per browser tab session (versioned sessionStorage key, memory fallback). The server checks the official Auth health endpoint with a bounded timeout. It is a non-blocking connectivity check with `scope: auth`, **not proof of database/RLS health**; server responses expose no project URL or key. Official source: https://supabase.com/docs/guides/troubleshooting/how-do-i-check-gotrueapi-version-of-a-supabase-project-lQAnOR .

UI audit rule: on **every** UI update load `kill-ai-slop`, scan changed UI scopes, triage source/visual candidates, rerun after fixes and preserve deliberate palette, 4px geometry, motion, custom scrollbar and accessible labels. Scanner report at `/Users/junhyeok_home/.hermes/cache/scratch/{craft-scan,wwm-scan}.json` (Craft 6 hits; feature 7 hits). Warm radial backgrounds are existing editorial direction; avatar radius and functional numeric section index are deliberate. Guest eyebrow and oversized heading remain hierarchy review candidates; do not automatically strip author styling. Current scan is a triage, not visual approval.

Do not modify hosted SQL/OAuth settings or publish changes as part of UI refactoring. Keep Next Link for room → `/craft/when-we-meet` and main → `/craft`, never `history.back` for direct invites.
