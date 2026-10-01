# Craft design system and migration status (2026-09-30)

Official basis: https://ui.shadcn.com/docs/installation/next , https://ui.shadcn.com/docs/components-json , https://ui.shadcn.com/docs/theming . This is an **existing** Next 16.3.6 / React 19 / Tailwind 4 project. `components.json` points at the existing global stylesheet and `@/*` aliases; generated shadcn Radix primitives live in `src/components/ui/`. Craft-only tokens in `src/app/craft/design-system.css` preserve SUIT/Pretendard, warm ink/surfaces and four-pixel bounded corners. The round profile image remains round. The homepage is not being restyled.

## Tokens and primitives (2026-10-01)

Tokens live on `:root[data-craft]` (light) and `:root[data-craft][data-mode='dark']` in `src/app/craft/design-system.css`, so Radix portals inherit them; dialogs/popovers must not redeclare palettes. Scale: type 12/14/16/20/28 (+40 display on /craft), weights 400/500/600; space 4/8/12/16/24/32/48; `--craft-h-md` 44px for every field and button, `--craft-h-sm` 32px for in-grid toolbars; one 4px radius (avatar 50%); layers sticky 20 / popover 60 / dialog 80 / popover-in-dialog 90 / toast 100. The same file holds the Craft look of the `src/components/ui` primitives (Input, FieldTrigger, Select, Checkbox, Command, Popover, Dialog, Calendar, Button), keyed on `data-slot`. Participant colours are `--craft-person-1…8` + `--craft-person-you`, mirrored and contrast-tested in `participant-palette.mjs`.

## Stage 2 surface rules (2026-10-01)

- One content column: `--craft-content-max` 1120px for the Craft index, When We Meet list/room and legal pages; the back link sits on the column edge; legal text keeps a 720px measure inside it.
- Room header (`RoomChrome.tsx`): title 28/600; one meta line `yyyy.mm.dd – mm.dd · Timezone` (the only timezone in the view); a compact `✓ Confirmed · Thu, Oct 1` chip (day only, every tab, so the header never changes height) when confirmed; outline Invite + ⋯ menu (Settings, owner Resend behind “Email N attendees again?”); on phones the title takes the full width and icon-only Invite + ⋯ share the meta row. No live-connection text; a dot + Offline only when the stream is down. A confirmed meeting opens on Confirm.
- Confirmed card (`ConfirmationPanel.tsx`): `✓ Confirmed` status, the sent event title (20/600), one time line `Thu, Oct 1 · 10:00–10:30 · Asia/Seoul` (16/500, tabular), `Invitations sent to N people` (owner) / `You’re invited · Organized by …` (member), primary Open in Google Calendar + outline Edit meeting (owner), then the owner-only Attendees list with Optional tags and Google RSVP (Accepted/Declined/Maybe/No reply + counts) when the owner’s calendar token can read the event; without it RSVP is simply omitted. The availability grid sits behind a collapsed Show availability disclosure. Pending/failed states use the shared icon Notice (never bare red text).
- Compact save status sits in the tab row (`Saving…` → `Saved` · N selected; error = `Couldn’t save` + Retry and an error toast). Copy/plurals come from `meeting-copy.mjs` (unit-tested).
- Grid toolbar: month 16/600 left; 32px tools right (Detailed | Compact segmented control, Fill from Google Calendar). One short legend line; no per-day sub-labels.
- Fill from Google Calendar: popover anchored to its button (Dialog bottom sheet ≤640px): Dates field → count + “Only these dates change” → Cancel / Fill N slots. Applying closes it and shows the 10s Undo toast.
- Toasts (`ui/sonner.tsx`): bottom-right desktop, full-width bottom on phones, icon + one sentence (+ optional action), 4s; Undo 10s. Close button inside the right edge.
- At most one filled primary per view; Confirm’s sticky footer appears only once a time is chosen; on phones the date/time fields fold into “Enter time manually” below the calendar; slot rows are 32px at ≤480px.
- Fields: hover darkens the border (no fill), disabled is half opacity. `ui/button` keeps `data-slot="button"` under Radix `asChild` triggers.
- `<html lang>` is set to `en` on /craft by the pre-paint script and CraftAccount (SSR HTML still says `ko`; a true per-segment lang needs separate root layouts).

## Information hierarchy / purpose

| Surface | User task and primary information | Primary action | Secondary / state |
|---|---|---|---|
| `/craft` | Discover services, scan short service name/description | Enter When We Meet | Site backlink; no invented counters |
| When We Meet home | Find **own** meetings; authenticated ownership matters | Open meeting or create a new one | Returning-user Google login; owned-list pending/error/empty |
| Creation | Enter meeting title, contiguous max-14-day range, half-hour time window, timezone and name | Explicit Create meeting, then one “{Title} is ready” dialog | Google login only after valid draft; range Apply/Cancel, no auto-create |
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

## Loading states

A loading state is the loaded screen with its data removed, never a separate drawing (`ServerSkeletons.tsx`, `skeleton.css`). It renders the same components and class names as the loaded screen, so heights and positions are the real ones:

- Meetings list: the real `ul > li` rows, a bar for the title, one for the summary line and one for the count.
- Room: the real header geometry, the real tabs (disabled) and the real calendar with nothing saved, inside `.wwm-ghost` (inert, data text hidden, a faint sweep over the grid). When the room's dates are known the real dates show; before that, placeholder days are drawn as bars.
- Confirm: the real heading, three fields, best-times card and calendar; no Fill button (the loaded Confirm tab has none).
- Invitation: a 190×44 bar where the Continue with Google button will be.

Suspense boundaries: the account in the Craft layout, the meetings list on `/craft/when-we-meet`, and the room (header and calendar chrome stream first; saved responses stream into the calendar). Change a loaded layout and its loading state follows, because they share markup.
