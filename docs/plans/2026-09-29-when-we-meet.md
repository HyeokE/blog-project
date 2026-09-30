# When We Meet Implementation Plan

> **For Hermes:** Implement task-by-task with test-driven-development; no commit or hosted changes in this delegated task.

**Goal:** A working local scheduling UI at `/craft/when-we-meet`, backed only when the existing hyeok.dev Supabase project is explicitly connected.

**Architecture:** Shared browser Supabase client under `src/lib/supabase`; isolated domain, adapter and UI under `src/features/when-we-meet`. Public invoker RPCs call private security-definer helpers; member-scoped RLS reads and owner-only response writes. Migration remains unapplied.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, Supabase JS, PostgreSQL RLS, node:test.

---

### Task 1: Domain contract and tests
**Files:** `scripts/when-we-meet.test.mjs`, `src/features/when-we-meet/domain.mjs`.
1. Write tests for inclusive <=14-day dates, aligned 30-minute time windows, timezone/DST UTC mapping, slot toggles and best-overlap ranking.
2. Run `node --test scripts/when-we-meet.test.mjs`; expect module-not-found RED.
3. Implement pure functions; rerun tests GREEN.

### Task 2: Adapter and configuration
**Files:** `src/lib/supabase/client.ts`, `src/features/when-we-meet/api.ts`, `.env.example`, `package.json`, `pnpm-lock.yaml`.
1. Assert unconfigured UI states via route/adapter tests before implementation.
2. Install pinned Supabase JS using pnpm 8; never expose service role key.
3. Implement Google OAuth PKCE sign-in on user action, validate the internal post-login return path, create/join/load/save RPC with explicit failure states. Verify tests and typecheck.

### Task 3: Routes and accessible UI
**Files:** `src/app/craft/when-we-meet/page.tsx`, `src/app/craft/when-we-meet/[roomId]/page.tsx`, `src/features/when-we-meet/WhenWeMeet.tsx`, `src/features/when-we-meet/when-we-meet.css`.
1. Add route smoke test RED. Implement create form, room join, keyboard/tap/drag grid, heatmap and ranked common slots; loading/empty/save/error feedback.
2. Verify with HTTP GET and Chromium viewport/screenshot. Avoid root redesign.

### Task 4: Isolated SQL and security
**Files:** `supabase/migrations/20260929000000_wwm.sql`, `docs/when-we-meet.md`.
1. Write static security tests RED for private definer helpers, explicit grants, auth.uid, RLS, FK and response constraints.
2. Implement additive migration; no remote apply. Document manual review gates, link confidentiality, auth impact on other services and connection steps.
3. Run tests, lint, typecheck, `git diff --check`; report hosted blockers honestly.

### Task 5: Vault sync
**Files:** existing `Projects/blog-project/README.md`, `Dev Logs/Hermes/2026-09-29 - When We Meet local MVP.md`, existing README index.
1. Read vault rules and existing notes; merge durable decision that project hyeok.dev is shared infrastructure with service isolation.
2. Record implemented vs proposed vs hosted verified, paths/test evidence and blocker; read back changed targets.

**Acceptance:** unconfigured state cannot claim persistence; no service key/client broad access; room links unguessable, scoped membership; own-response edit only; no database or shared Auth setting changed; local build/tests and UI smoke evidence explicit.
