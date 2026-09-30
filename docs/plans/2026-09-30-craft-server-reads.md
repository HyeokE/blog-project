# Craft server reads / boundaries — bounded implementation

1. Replace the browser Supabase session store with `@supabase/ssr` browser cookie PKCE; use server cookie client only inside uncached same-origin route handlers, call `auth.getUser()` before user-scoped RLS queries. Existing localStorage-only sessions require a fresh Google login; preserve tab-scoped creation draft and callback destination. Never use service-role credentials.
2. First implement and test account, owned-list and room GET handlers; then move mutations to same-origin POST handlers with origin and input validation. Keep room member policies unchanged (roster remains unavailable).
3. Introduce identity-scoped, genuinely suspending initial read resources and shared retryable boundary/skeleton in list and room. Clear resources on identity transition; preserve drafts on mutation errors. Verify typed/lint/unit/API behavior, then browser. No date picker or hosted SQL edits; no build/restart of shared dev server.

Acceptance boundary: distinguish HTTP unauthorized, bad input and RLS denial; no browser PostgREST XHR; no claim of live OAuth/save unless exercised. Existing 16-slot Test fixture untouched.

## 2026-09-30 architecture correction / handoff
The current `useCraftQuery` + client `<Suspense>` list/room implementation genuinely suspends but **does not satisfy** the user's latest requirement for section-owned **server component** Suspense. Do not report that requirement as complete. Keep the working same-origin cookie/RLS handlers and validated auth redirect fix while transitioning incrementally:

| Route/section | Data owner and boundary | Fallback/error geometry |
|---|---|---|
| `/craft` account chrome | Server layout obtains `auth.getUser()` from request cookies; pass minimal identity to interactive account menu, no public cache | Keep chrome dimensions and account control placeholder until identity resolved; account error retry, not guest flash |
| `/craft/when-we-meet` owned meetings | Async server component under `<Suspense>` in server page/layout, query owner-filtered `wwm_rooms` using request cookie RLS; interactive list links client side | Two meeting rows matching row height and title/metadata lines; localized error + retry without losing header/new-meeting form |
| `/craft/when-we-meet/[roomId]` header + availability | Async server room component queries room/member-gated responses once per identity; passes normalized initial data to interactive room editor. Keep join gate for authenticated nonmember / invited guest. | Room title/date/timezone header and grid shell/date/time rail sized to actual data; separate error boundary/retry at room data section, not entire site |
| Mutations | Same-origin POST handlers retained; client event state retains input/slots, invalidates owner/room data after success | Pending/error next to controls; no skeleton replacement on save |

Use Next 16 installed docs `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `03-api-reference/04-functions/cookies.md` before editing; cookies are async and GET uncached by default. Server components should not import client `useCraftQuery`/hooks. Test actual streamed HTML under controlled delayed reads and error/retry in a local isolated harness before replacing the current functional client regions; do not use hosted SQL changes, service-role key, or shared `.next` build/restart without coordination. Current anonymous/CSRF HTTP paths and Tailnet redirect tests pass; authenticated streaming and OAuth return remain unverified.
