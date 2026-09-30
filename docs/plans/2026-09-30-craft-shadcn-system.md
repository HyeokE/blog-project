# Craft shadcn/ui Integration Plan

> **For Hermes:** Implement in small test-first steps; do not commit or touch hosted systems.

**Goal:** Give Craft and When We Meet one coherent shadcn/ui-based control vocabulary while retaining the existing warm editorial identity and scheduling behavior.

**Architecture:** Keep domain, auth, and gesture logic in feature components. Add generated Radix-backed primitives under `src/components/ui`, Craft-scoped tokens and shared variants. Adopt actual primitives in account, create/join, calendar/time, and room surfaces; leave domain-specific grid cells and range-selection state as adapters. Avoid global theme changes.

**Tech Stack:** Next 16.3.6, React 19, Tailwind 4, pnpm 8.15.9, shadcn CLI official registry, Radix.

---

1. Inspect existing AGENTS, Next installed CSS guide, Craft controls/CSS, and official installation/components.json/theming documentation. Capture baseline tests and browser states where available.
2. Add configuration pointing to existing `src/app/globals.css`, `@/*` alias and `src/components/ui`; use CLI to install only required primitives. Verify generated files and avoid overwriting global CSS.
3. Write failing behavior/contract tests for shared control tokens and migration, then implement scoped Craft Button/Input/Label/Tabs/Popover/Calendar/Dialog/DropdownMenu/ScrollArea adoption. Preserve dates, draft, session and animations; test after each coherent migration.
4. Verify Node feature suite, TypeScript, scoped lint, isolated build when safe, browser snapshots at relevant widths and interactions without saving real rows. Reconcile scoped CSS, document design usage and limitations.
5. Sync durable decision and verified results to existing vault project note and Hermes work log, with no credentials or unverified claims.
