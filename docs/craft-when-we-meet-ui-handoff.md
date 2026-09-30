# Craft / When We Meet — UI implementation handoff

2026-09-30. Design-only specification; no application changes in this handoff. Companion: `docs/craft-design-system.md`, `docs/plans/2026-09-30-craft-shadcn-system.md`, and the implementation-ready New meeting modal state/acceptance specification `docs/plans/2026-09-30-new-meeting-dialog.md`. Scope is `/craft` and `/craft/when-we-meet` descendants, not homepage, Travel Mate or Toss. Preserve existing room/date/storage model, permissions and user data.

## Observed baseline and design intent

Authenticated Aside on tailnet HTTPS 8446 showed the owned-list with two rows and a header create button, then room `03e3c543-4288-4f44-b7c3-fcc7ca9dc49d` titled Test, period 2026-09-29–2026-10-12, one saved respondent, 16 saved selections. Room currently has three Korean tabs, Korean save/status/date navigation, a bottom Share section, and slot cells displaying `0/1` even on the personal editor. No cell was changed. Aside evidence: owned-list screenshot `~/.aside/u/0/sessions/2026-09-30_a8QO5aVMbYNOOkqw/artifacts/wwm-home-design.png`; room screenshot `~/.aside/u/0/sessions/2026-09-30_MMaqbojS0p4Uslyo/artifacts/wwm-room-design.png`. These are desktop settled states, not mobile or transition verification. Existing code: `src/features/when-we-meet/WhenWeMeet.tsx`, `DateRangePicker.tsx`, `DateTimePicker.tsx`, `when-we-meet.css`, `src/app/craft/page.tsx`.

## Shared contract

Use official installed shadcn/ui Radix primitives in `src/components/ui`, adapting domain widgets instead of inventing a parallel primitive library. Preserve warm editorial ink/paper palette, SUIT/Pretendard, thin rules, bounded radius **4px** (avatar truly circular). Unified control heights: 40px desktop, minimum 44px mobile touch target; input/button same height per row; 8px internal icon gap, 12px adjacent-control gap, 24px section gap, 32px major-section gap. Body 15–16px/1.5, label 13–14px, metadata 13px; heading Craft and list 32px desktop/28px mobile, room title 32/26, section title 20/18. Treat these as target geometry within existing scoped tokens, not a global CSS reset. Focus ring visibly contrasts on warm paper, 2px with 2px offset; error text adjacent to offending field plus announced summary. All visible and accessible UI copy **English**, including menu, calendar, aria labels, statuses, list, join and OAuth dialog; retain user-entered room/name verbatim even if Korean. Visible full dates `yyyy.mm.dd`, zero-padded and formatted in room timezone; retain ISO storage, calendar cell day numerals, 24-hour `HH:mm`.

Shared Craft account control top-right on every route, stable loading/auth state with no guest flash. Back links are explicit (`/craft` from list, `/craft/when-we-meet` from room), not browser history. `RollingNumber` only changing quantitative counts (saved selections, respondents, ranked scores), static first SSR digit and no mount roll/zero flash; never dates/times/IDs/input values. Honor reduced motion.

### Layout grid

At 1440px: centered content max-width 1120px, side margins >=48px; top back link and profile separate, hero starts ~24px below back link, title/primary actions in one flex row, metadata immediately below title (8px), tabs ~32px below hero. Form/list content starts ~24px below header. At 375/390px: 20px horizontal inset, no page horizontal overflow; account remains top-right clear of backlink; hero action wraps below title/meta, full-width only when helpful; four tabs horizontally scroll inside tablist (not document), each complete short label visible by scroll/focus, active tab always brought into view. Keep grid's own labeled horizontal scroll; time rail sticky 64–72px, date columns >=104px, three-day desktop window, one/two-day mobile window depending actual width without shrinking glyphs. Sticky top date row/time rail/corner must have opaque warm solid surfaces in light/dark. Timetable maximum visible height ~480px desktop/~55dvh mobile with native x/y scroll; slim warm 4px native scrollbar, no scrollbar caused by tab exit. Avoid fixed overlays over virtual keyboard.

```
Desktop: [← Meetings]                                      [avatar]
         [Room title                          Save availability] [Invite people]
         [2026.09.29 – 2026.10.12 · Asia/Seoul]
         [Saved · 16 selected]  (status, outside tabs)
         [Your availability | Group availability | Recommended times | Participants]
         [tab-specific content only]
Mobile:  [← Meetings]                            [avatar]
         [Room title]
         [2026.09.29 – 2026.10.12 · Asia/Seoul]
         [Save availability] [Invite people] (wrap)
         [status] [horizontally scrollable tabs]
         [tab-specific content / internal grid scroll]
```

## Page contract

| Route/state | First content and task | Primary/secondary actions | Empty/error/loading |
|---|---|---|---|
| `/craft` | Compact Craft title and one-line description, immediately followed by service row `When We Meet` | Enter service; back to site and account secondary | Do not introduce invented counters, duplicate eyebrow/oversized promo hero. Service row discoverable without long scroll at desktop/mobile. |
| WWM signed-in home | `When We Meet` title, owned meetings ordered by newest with title and localized full date range/time/timezone | `New meeting` beside title on desktop/below on mobile; row opens room; back to Craft | Show true owned-only list. Empty: `No meetings yet.` and create action. Initial region-matched rows skeleton; region retry on failure. Keep existing rows visible while refreshing. No redundant visible “My meetings” toolbar title (accessible region label remains). |
| WWM guest home/create | Short heading/description then usable create form, not entrance login blocker | `Create room`; secondary `Already have an account? Sign in with Google` | Auth uncertainty must not show guest form transiently. Invalid submit stays in place with inline error. Valid submit when guest opens accessible Google prompt, stores tab-scoped draft; OAuth return restores form and requires explicit resubmit; cancellation preserves draft. |
| Create form | Title, contiguous date range, daily time window, timezone, your name in that order | Create room; calendar Apply/Cancel/Reset; time direct half-hour choices; timezone searchable IANA options | Title/name free text. Range popover supports direct dates, Today and meaningful range shortcuts, max 14 inclusive days, reverse-order repair, outside dates disabled. Cancel keeps committed range; Reset clears draft only until Apply. Time list offers half-hour increments, clear where optional (not for required bounds), validates end > start; timezone searchable with current/recent suggestion, no browser-native select as finished surface. Do not preselect consequential dates. Creation status/error on form, never whole-form skeleton. |
| Joined room | Room title and date range + timezone immediately underneath, no eyebrow or repeated timetable heading | `Save availability` if dirty (disabled if clean), secondary `Invite people` in header opens copy-link popover/dialog; status outside tabs | Invite error/copied feedback near action, no bottom Share essay; token/link shown only to authorized holder and never expose unowned invite token by guessing. Join gate shows name and prefilled invite token when present, clear validation/errors; keep actual permission checks. |

## Four room tabs

| Tab | Required top-to-bottom content | Interaction / exceptional state |
|---|---|---|
| **Your availability** | Small `Your name` input, compact day navigator `[Previous] [2026.09.29 – 2026.10.01 ▾] [Next]`, editable grid with selected indication; concise legend only if needed | Personal slot button's accessible name says date/time + selected/not selected; avoid misleading group counts as primary cell label here. Calendar jumps to any day in room's inclusive max-14-day range; month/year navigation cannot escape range, selected day/window highlighted. Change day or tab preserves name/slot draft, never writes DB. Mouse drag selects; keyboard Enter/Space toggles; touch stationary release toggles once, >10px travel, scroll or pointercancel aborts and suppresses synthetic click; preserve pan-x and pan-y. Save only on explicit action; failure retains draft. |
| **Group availability** | Respondent basis above read-only heatmap (`Saved responses: N`; distinguish joined nonrespondents when roster available), same date navigator and grid geometry, heat intensity/`x/N` per slot | No edit or save instruction within panel. Zero responses: `No saved availability yet.` with honest empty grid or message; unsaved personal choices excluded. Tooltip/focus detail gives numerator, denominator, slot date/time; color not sole signal. |
| **Recommended times** | Basis `Based on N saved responses`, then ranked six 30-minute candidates with full date, time, `x/N available`; prefer universally available first, then overlap count, stable date/time tie-break | Do not promise meeting selection/persistence if no such action exists; navigation to corresponding group grid slot may be an optional read-only action. Distinguish no saved responses from saved responses with no shared slot; explain latter ranking by most available, no fake unanimous label. Counts animate only on actual change. |
| **Participants** | Actual member roster, joined name and `You` marker, response state `Availability saved` vs `No response yet` with counts summarized | Requires authorized members API/RLS covering joined members including nonrespondents. Existing `wwm_members` self-only RLS cannot truthfully render roster from responses; do **not** infer members from responses or present one respondent as all participants. Until backend policy is reviewed/implemented, show an explicit unavailable/error state, not fabricated roster. No admin removal feature or permission changes by UI lane. |

Tabs use semantic Radix tablist/trigger/panel, Arrow/Home/End keyboard navigation, stable IDs/aria-controls, focus-visible and inactive panel not tabbable. Single shared moving indicator and restrained ~200–240ms panel fade (no reset of grid/date/draft); rapid reversals do not trap focus in exit content or produce document overflow. Reduced motion uses immediate state. Calendar open/close and month changes ~180–220ms opacity/6px, exits inert/unfocusable; month popover stays bounded at 375px and never traps page scroll.

## Async, backend and boundaries for developer lane

Initial reads: actual Suspense-backed fetching with shared ErrorBoundary and **region-specific geometry-matched** skeleton (list rows, room header+tab/grid shell, join state); no timer/artificial gate or full-page intro on Craft. Revalidation retains valid content and subtle status; mutation uses `Saving…`, success/error and preserves inputs, not skeleton. Clear private content on signout/identity change. Health `GET /api/health/supabase` runs nonblocking once per tab with Auth-only scope, no visual loading UI and never interpreted as DB/RLS proof.

All application Supabase requests must move through same-origin Next.js server APIs using cookie PKCE session and user RLS; existing browser client (`WhenWeMeet.tsx` and `api.ts`), membership visibility and real OAuth return require backend developer review. Never use service-role bypass, alter hosted SQL/OAuth without explicit scope, or invent server success. Protect invite token and ensure group aggregates based on saved responses, not draft. Existing Test room 16 saved slots must remain untouched in QA. No commit/deploy/launchd restart from design lane.

## Acceptance gates / implementation slices

1. Shared tokens/primitives and English/date formatter: inspect Craft index/list/create/join/room/account menus at 1440, 1024, 768, 390, 375; verify avatar circle, 4px bounded corners, focus, zero-padding and timezone month boundary. Scan each UI change with `kill-ai-slop`, triage intentional warm background/avatar/functional numbers, do not auto-delete.
2. Hierarchy/form: first service row/action placement, signed-in owned list and guest draft/auth round trip, date Apply/Cancel/Reset and 14-day maximum, half-hour bounds, timezone keyboard search, all errors. Check OAuth already-signed-in, cancel, logout and private content clearing.
3. Room tabs/roster: genuine joined-without-response backend fixture, own/group distinction, ranking basis, unsaved draft preserved across tab/date, explicit save/reload, mutation failure, invite copy. Test narrow full 14-day room and month boundary. Never mutate Test room; use QA fixture with restored baseline or isolated test data.
4. Motion/input/async: sample intermediate frames and rapid reversals, focus/exiting behavior and reduced motion, no document overflow or ghost scrollbar; native touch tap vs horizontal/vertical swipe/cancel, keyboard drag alternatives and sticky opaque rails; actual Suspense fallback/error/retry vs retained revalidation content. Typecheck, focused tests, scoped lint/build, and visual screenshots after implementation; source assertions alone do not certify interaction. No Safari/physical mobile claim from Aside screenshots.

### Audit at design handoff

`kill-ai-slop` scan of `src/app/craft` (2026-09-30): six hits across atmospheric background, kicker, full-sentence headline, radius and section marker. Existing warm radial paper and circular avatar/functional service number are intentional, not automatic removals. Repeated eyebrow and oversized title are hierarchy candidates; room baseline confirms Korean copy and bottom Share are explicit revision targets. Audit is not implementation/visual acceptance. Protected `AGENTS.md` change approval previously timed out; keep instructions in ordinary design docs without modifying that file.

### New meeting implementation review (2026-09-30)

The dialog uses the shared shadcn Dialog, Button and Input while preserving Craft's warm SUIT/Pretendard palette and 4px corners. Toss-inspired here means a restrained responsive rhythm, not official Toss motion or branding: an 8px rise and opacity over 260ms, 180ms exit, with reduced-motion immediate. Keep the fixed centering transform present at insertion and animate no more than the deliberate vertical displacement. Authenticated desktop 1440×900 first-frame sampling in three repeated cycles yielded center offsets `dx=0, dy=8px` at insertion and `dx=0, dy≈0.28px` by frame 17; no 320px jump. The independent implementation hierarchy review remains open: authenticated 375/390px and short-height screenshots were not captured because this Aside REPL does not expose `setViewportSize`. The server API migration, real Suspense initial reads, OAuth round trip and live create mutation are not verified by this UI slice.
