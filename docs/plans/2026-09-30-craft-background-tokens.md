# Craft background tokens — 2026-09-30

Craft routes share a solid canvas token, `--craft-canvas`, scoped to `.craft-chrome`, `.craft-page`, `.wwm`, and `.craft-account`: light `#eae6d8`, dark `#292a23`. The Craft chrome overrides the inherited Light Wall gradient; both Craft index and When We Meet use the same canvas. `--craft-surface` remains distinct for dialogs, menus, popovers, skeletons, and opaque sticky timetable rails. No OAuth or service logic changed.

Live local verification on port 3002: `/craft` and `/craft/when-we-meet` report identical computed chrome/page backgrounds in light `rgb(234, 230, 216)` and dark `rgb(41, 42, 35)`. Room content was not verified (authentication-dependent). Scanner's atmospheric-gradient finding disappeared; remaining Craft findings concern unrelated typography, circular avatar, and project sequence. Existing unrelated AGENTS.md trailing-whitespace check failure is outside this CSS scope.
