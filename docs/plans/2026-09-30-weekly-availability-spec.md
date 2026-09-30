# Weekly participant availability — decision and integration specification

> **Parent review — revision required:** Do NOT implement the proposed merge of Overlap with People. The conversation's proposed direction is to combine own availability editing and overlap comparison, while preserving Suggestions and People as separate purposes. This child proposal changes that direction and is not approved. Retain the useful responsive timeline, stable-color, UTC slot identity and saved-response provenance analysis below as reference only. Parent-approved first implementation slice is pure timeline projection helpers with no tab or editor changes; the unified interactive-view specification must be corrected before UI integration.

> **For Hermes:** Parent reviews this bounded proposal before implementation; then use test-driven, small slices. This document does not approve a wholesale room redesign.

**Goal:** Show who among *saved respondents* is available at each half-hour, alongside aggregate overlap, without suggesting that saved responses equal all joined members.

**Architecture:** Merge the existing Overlap and unavailable People *presentation* into one read-only `Group availability` tab with an aggregate timeline plus participant rows; retain `Availability` as the only editor and `Suggestions` as ranking. No roster fetch or policy change. The parent must explicitly accept this three-tab merge; if a real joined-member roster is required, retain the fourth People placeholder until an authorized roster contract is approved.

**Tech stack:** Existing React/Next, Radix `Tabs`, `makeSlots` UTC identities, normalized `Response[]`, scoped Craft CSS. No new dependency, database policy, API or service-role path.

---

## Decision and tradeoff

**Recommend three tabs:** `Availability` (own draft/editor), `Group availability` (existing saved-response aggregate + individual saved-response rows), `Suggestions` (existing ranking). Remove the nonfunctional People placeholder only after the parent approves this explicit merge. The group view is not a member directory. Label its basis `N saved responses`; when zero, say `No saved availability yet.` Do not say `all participants`/`everyone` without qualifying `of N saved responses`. A joined person without a saved response cannot be represented here. If product intent is to expose *every joined person including nonrespondents*, do not merge: that is separate authorized roster work, not a UI inference from `Response[]`.

Keep the aggregate summary above participant detail, so quick scheduling remains primary. Do not replace the heatmap with a seven-day-by-person matrix. `Suggestions` remains distinct: its ranked six instants answer a different task. Preserve selected draft, calendar offset and scroll state on tab switching where practical; a tab switch is never a save.

## Layout and behavior

- **Desktop >= 768px:** Group tab header `Based on N saved responses · {room.timezone}`; shared week navigator with previous/next week and a week-start date picker bounded to the room's inclusive 14-day range. Week is seven consecutive room dates (last week may contain fewer); use room-start anchored windows, not locale-dependent week starts. Below it, a horizontally scrollable time-axis timeline: date sections across the 7-day window; within each date, 30-minute columns and an aggregate bar followed by one row per saved respondent. Each row has a sticky participant-name rail; bar segments align exactly to real slot UTC IDs. This is a timeline *per date*, not 7×people separate vertically repeated cards. Give each date a visible heading and each time axis a `HH:mm` label; sticky labels and dates must have opaque surfaces and never obscure bars.
- **Mobile < 768px:** Same week navigator remains visible as context, followed by a seven-day selector (short weekday + day number; selected day unmistakable). Render **one selected date** at a time, with horizontally scrollable half-hour timeline and vertically stacked aggregate + respondent rows; do not stack seven full grids. A 14-day range is reachable in two week windows, including the final day. Changing week selects the first included day unless the previously selected date remains inside. This avoids a 7×people page-height explosion; the cost is an extra day tap versus a full weekly overview. Parent should choose this tradeoff explicitly rather than silently carrying desktop geometry onto mobile.
- Aggregate row: each half-hour displays a count `x/N` and heat intensity; bar widths align with participant bars. Respondent rows sort deterministically by case-insensitive display name then `user_id`, with current user's row visibly marked `You`. Color is assigned deterministically from `user_id`, not response order or name; choose a fixed distinguishable palette in both themes. Names beside swatches form the legend; do not rely on color alone. Duplicate display names stay distinguishable by `You` or a short nonsecret disambiguator, not exposed UUIDs.
- Every respondent row comes only from `responses` returned by the authorized room read. A person's selected segment means the normalized UTC slot ID occurs in their **saved** `slots`. Never render `mine` (unsaved editor state) in this view. If local edits are pending, explain briefly `Your unsaved changes are not included.` Do not synthesize empty rows for presumed members.
- Hover/focus a segment to show respondent name, full room date, time with UTC offset where repeated, timezone, and `Available`; tapping a segment opens the same detail without depending on hover. Aggregate detail gives full date/time and `x of N saved respondents`, optionally names of those available. Tooltip/dialog must be keyboard reachable, dismissible by Escape/outside tap, anchored within viewport and avoid duplicate native title tooltip. Individual segments are read-only controls; no `aria-pressed`, toggle handler, or disabled button blocking focus. For screen readers, group by date and named row; expose concise full slot labels rather than making a color-only chart. At maximum slots/respondents, consider a focused per-row details control if thousands of focus stops become impractical; do not silently truncate data.
- Slot lookup should be keyed by `slot.date` + UTC `slot.id`, **not** `date|time`: DST fall-back can create two distinct instants with the same wall time; spring-forward can omit one. Show both repeated instants with offset distinction and never invent missing bars. A date's time scale uses the actual ordered slot list, preserving half-hour units and the room's configured daily bounds.

## Exact integration seam

Current `WhenWeMeet.tsx` has four `view` values (`mine`, `overlap`, `recommendations`, `people`), three-day `visibleDates`, an editable grid and read-only overlap heatmap in one large render branch; `api.ts` defines `Response={user_id,display_name,slots}` and normalizes UTC ISO strings. `craftRoom` in `src/lib/supabase/server.ts` reads `wwm_rooms` plus `wwm_responses` only. The People panel explicitly says a full authorized member list is unavailable. Existing `src/components/ui/tabs.tsx` is Radix; existing tab CSS is a four-column segmented track that becomes 2×2 on mobile. No shared Tooltip/HoverCard was found under `src/components/ui`; use a small local accessible detail surface built with existing Popover/Dialog only if their semantics fit, not a new dependency.

Proposed component tree:
```
WhenWeMeet (owns room, responses, mine/savedMine, save/error, view)
  RoomTabs (Radix existing, controlled view)
    AvailabilityEditor (current own name/day grid; only writable view)
    GroupAvailability
      ResponseBasisAndWeekNav
      DesktopWeeklyTimeline | MobileDaySelectorAndTimeline
        TimelineAxis / AggregateRow / RespondentRow / SlotDetail
    Suggestions (existing ranked six)
```
Derive `slots=makeSlots(room)` once; `savedIdsByUser=Map<user_id, Set<UTC slot id>>`; `slotById=Map<UTC slot id, slot>`; `countById` from responses; never couple visual color to array index. Local `weekOffset` and `selectedDay` are group-only state; preserve the editor's existing three-day `dayOffset` and date picker unchanged. The existing `aggregate` sort is by count, so use chronological `slots` for the timeline, ranking only for Suggestions. If group date controls reuse `calendarDays`/`offsetForDate`, distinguish the group seven-day window from the editor three-day window. Keep the existing save POST payload and response read untouched.

Implementation slices (parent assigns ownership):
1. Add pure timeline projection helper/tests under `src/features/when-we-meet/` and `scripts/`: week windows for 1/7/8/14 days, respondent sorting/colors, saved-only counts, DST duplicate wall labels and missing slots. Run focused `node --test scripts/when-we-meet-*.test.mjs` and typecheck; expect all pass (do not claim now).
2. Extract/reuse current group aggregate semantics before changing tabs; render desktop `GroupAvailability` from existing read only. Verify exact `x/N` against a two-respondent fixture, identical UTC slot IDs and responsive scroll. Do not change editor gestures/save.
3. Add mobile day selector and detail interactions, then switch controlled tab map to three values and CSS from four columns/2×2 to three single-row targets; keyboard Arrow/Home/End, focus and tab transition must continue working. Indicator/background and panel fade only; **no Y translation**. Reduced-motion immediate.
4. Regression: save failure preserves draft; switching tabs/weeks doesn't POST; reload returns only persisted selections; suggestions basis agrees with aggregate. Test member policy behavior using an authorized fixture, never service role. Run focused tests, typecheck/lint, and authenticated visual QA before declaring implemented.

## Acceptance gates

- At 1440×900 show 7 dates in bounded internal timeline, visible timezone, aggregate + names/swatches and no document horizontal overflow; at 768 width avoid clipped participant labels. At **320×568, 375×812, 390×844**, show week context and all 7 selectable days without document overflow (selector may scroll internally); only one day's aggregate/respondent rows render, with horizontal timeline scroll, sticky name rail, readable 12/24-hour-independent `HH:mm` labels, minimum 44px touch targets and no overlapping popup/keyboard. Verify first/last date and 14-day transition.
- Use fixtures: no responses, one, multiple with duplicate names, a current user with dirty unsaved changes, a joined nonrespondent absent from responses, DST skipped/repeated half-hours and timezone-offset transition. Empty/error/loading states state exactly what is known; no fake `0/all members` or roster. Error in room read retains existing error handling; do not interpret empty array as fetch failure.
- Test mouse hover, keyboard focus/Enter/Escape, touch tap/dismiss and horizontal/vertical pan; details show names on actual segments and numeric count on aggregate. Contrast in light/dark, visible focus, reduced motion, no focus trap after rapid tab changes. Existing editor touch/drag behavior, explicit save/reload and suggestions stay intact.
- Parent to capture real authenticated viewport evidence and regression output after implementation. This is source-grounded design only, not live visual or mutation verification.
