<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules (user decisions, 2026-09-30)

- All initial asynchronous reads use a real Suspense-compatible data source and a shared ErrorBoundary abstraction. Show geometry-matched skeletons for genuinely unresolved regions, with one accessible loading status and reduced-motion-safe presentation. Do not replace useful content with an artificial full-page loading screen. Event-handler mutations are not caught by render error boundaries: keep explicit pending/error feedback at their controls, preserve drafts/saved data and avoid skeletons on save or same-user revalidation.
- Route all application Supabase data requests through same-origin Next.js server Route Handlers. Authenticate the server request as the current user under RLS; do not use a service-role bypass or move browser auth tokens into logs. PKCE/session-cookie migration must preserve sign-in continuity or explicitly disclose a required re-login. Validate writes and handle CSRF/error responses. This is a project-wide rule; an incremental migration must not be reported as whole-project completion.
- For Craft, use the existing warm editorial palette and typography with shadcn/ui primitives, 4px bounded corners, restrained reduced-motion-aware motion and a shared rolling-count component for genuinely changing quantitative counts. Do not animate calendar dates/times, identifiers, input values or static numbering. Keep the blog homepage outside Craft's visual migration.

- Naming (user decision, 2026-09-30): database objects, SQL, RPC parameters and raw Supabase rows use `snake_case`; everything above the data-access layer — TypeScript/JavaScript identifiers, object keys, API route JSON and component props — uses `camelCase`. Convert in exactly one place per boundary (row normalizers next to the Supabase/pg call, e.g. `normalize.mjs`), never ad hoc inside routes or components. Existing snake_case keys that leak into the app layer (e.g. `room.owner_id`, `start_date`) are migration debt to remove, not a pattern to copy.
