# WWM Storybook implementation and acceptance

## Scope
User requests a running Storybook to browse all WWM cases, explicitly including loading UI, receiving invitations and errors. Inventory actual production branches; distinguish UI coverage from backend E2E verification. No fake implemented features, production data, OAuth, mail or DB writes.

## Tasks
- [ ] SB-01 Child implementation (`deleg_eec85e92`, `sa-0-d5acc0c7`): compatible Storybook framework/dependencies, scripts/config, real component stories, synthetic isolated mocks, light/dark and viewport controls, explicit case manifest and gaps. Child owns `.storybook`, dedicated stories, package scripts/devDependencies/lock, documentation; minimal injection seam only if required. No unrelated edits or commits.
- [ ] SB-02 Parent spec review: compare actual WhenWeMeet, account, invitation, save/sync and error/skeleton branches against manifest. Every implemented visible branch should have a reachable deterministic story; missing product UI documented separately.
- [ ] SB-03 Parent safety/code review: no real request/EventSource/auth/navigate/mail/Supabase side effects; fixture isolation/reset; no real env secrets exposed; preserve production behavior.
- [ ] SB-04 Parent execution: review install/build/typecheck results; start local dev server on a verified free port (6006 candidate), health check root/index/iframe. Keep server running as requested. No Tailscale mapping changes without approved scope.
- [ ] SB-05 Browser verification: enumerate story IDs from served index, render all story entries in bounded batches, persist per-entry success/error and reconcile counts programmatically. Inspect representative mobile/desktop light/dark, loading, invite, error/retry and15-person views. Report blocked/error cases honestly; no claim of all possible backend cases.
- [ ] SB-06 Handoff: actual local URL, launch command/process handle, implemented cases/counts and known gaps; update canonical vault ledger/log.

## Case families
Account loading/guest/auth/error; list skeleton/empty/populated/error; create/draft/validation/submission/login required/failure; invite signed-out/signed-in/joining/already joined/invalid/missing/failure/retry; room skeleton/not-found/unauthorized/error/retry; Availability/Everyone/People; empty/one/two-slot/full-day/month-crossing/15-person overlap; saving/saved/failure/offline/reconnect; Settings and shared dialogs/inputs currently implemented.

## Admission
2026-09-30 18:33 KST pressure1 (normal), swap547.25MB versus previous555.25MB. Single child, avoid concurrent heavy builds. Protect existing Next server, Aside/Orca and user processes. Current dirty tree is intentional; no cleanup/reset/staging.
