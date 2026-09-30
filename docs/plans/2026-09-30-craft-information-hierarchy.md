# Craft information hierarchy — manager specification

User direction: Toss-style clarity and action hierarchy, not a change to Toss branding. Retain warm Craft palette, SUIT/Pretendard, 4px corners and no vertical translation animation. This is a target specification, not a claim of completed UI.

## Ownership and order
Parent owns this design and range density implementation. Active children own the authenticated-cookie 500 repair and timezone integration; they must not redesign page hierarchy independently. Restore the 500 before authenticated visual acceptance. Apply UI changes in bounded reviewed slices, not one broad rewrite.

## Creation dialog: one dominant action
1. Header: `New meeting` as the only prominent heading; close control. Existing instructional sentence is redundant with field labels and should be visually hidden for accessibility rather than consume two mobile lines.
2. Primary input: meeting title. Concise visible label `Title`, placeholder as an example only. Do not prefill a real title.
3. Schedule group: `Dates`, then `From` and `To`. Keep related time controls together where readable; do not squeeze below usable widths. Show the 14-day rule only once near Dates, not repeated in trigger, heading and feedback.
4. Secondary context: timezone and participant name. Same readable control typography, quieter labels; no collapsed required inputs.
5. Footer: `Create room` is the sole filled primary button; Cancel is a quiet secondary action; Reset is a low-emphasis destructive-to-draft action separated from submission. Preserve all existing handlers and draft semantics.
6. Errors stay adjacent to their input; submission error remains visible without replacing the form. Do not reserve empty feedback height unnecessarily.

## Typography and spacing
- Heading 24px / 1.3 / 650; field values 16px / 1.5; labels 13–14px / 1.4 / 500; helper text 12–13px muted.
- Use spacing to establish groups: 8px label-to-control, 16px related fields, 24px between conceptual groups. Reconcile actual current 7px spacing as one shared token rather than accumulating arbitrary overrides.
- Controls remain 44px minimum; dot is exactly 4px adjacent upper-right of label glyphs without line-height changes.
- No multiple heavy outlines around the same group; use surface contrast and whitespace. Keep focus outlines clearly visible.

## Other pages
- Craft index: service discovery; modest title and actionable service entries.
- Meeting home: title + New meeting, then owned meetings. No repeated product introduction above an authenticated list.
- Detail: meeting title → date/timezone metadata → save/dirty state once → task tabs → content. Save is primary only while edits exist; Invite is secondary.
- Availability/Overlap consolidation and weekly participant timeline require a separate approved interaction spec; do not silently alter current data semantics or imply response rows are full membership.

## Parent-owned range density slice
Reuse installed Calendar/Popover. Desktop two months, narrow screens one month. Reduce desktop popup from 672px toward 592px, day cells from 40px to 36px, month gap from 18px to 12px and popup padding from 12px to 8px. Keep mobile day cells 40px (38px at <=375px) and mobile popup bounded by viewport; do not shrink the 44px form trigger or apply CSS scale. Verify actual table layout and selected range before acceptance; proposed dimensions may be adjusted if overflow appears.

## Acceptance
Inspect 320x568, 375x812, 390x844 and 1440x900. Check one unmistakable primary action, readable values, coherent grouping, last required field and error reachable by native scrolling, footer/popup actions reachable and no document overflow. Verify screenshots, focus, nested Escape and preserved drafts; screenshot-only evidence is not save/OAuth proof. Run focused regressions and kill-ai-slop after UI changes. Do not mark this specification implemented until corresponding code and live evidence have passed parent review.
