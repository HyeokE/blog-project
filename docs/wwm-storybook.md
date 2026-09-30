# When We Meet Storybook

## Private Tailscale access
- https://macmini-home.taile6a871.ts.net:8447/ → http://127.0.0.1:6006. Tailnet-only Serve; existing443/8444/8445/8446 mappings preserved.
- Parent readback and HTTPS200 plus actual room story rendering verified. Core and Vite allow only the exact Tailnet hostname in addition to local defaults. HMR WebSocket not independently verified.
- Current process `proc_dac4b2e96b8b`, command `bun run storybook --host 127.0.0.1 --ci --exact-port`; supersedes earlier process below. No permanent launchd service added.

## Run
- `bun run storybook` → http://localhost:6006 (script explicitly sets NODE_ENV=development; this host exports production and otherwise jsxDEV is undefined).
- `bun run storybook:build` produces a static build.
- Parent-running dev process: `proc_a3c1ca8c0399`, started 2026-09-30. Process handle is session evidence, not a permanent service guarantee.
- Use theme toolbar and viewport controls. API and EventSource are synthetic; no production data, OAuth or mail. Relative `./api` imports as well as the absolute alias are intercepted. Local link navigation is suppressed inside stories. Creation/saving success means fixture success only.

## Browser-verified manifest (2026-09-30)
47 unique served index entries were opened at390px with per-story completion after play functions;47 completed,0 failed. Evidence `/Users/junhyeok_home/.hermes/cache/scratch/wwm-storybook-verification.json`. This establishes render/play coverage, not production backend integration or exhaustive combinatorial testing.

### Home and creation
GuestHome, AccountLoading, EmptyMeetings, PopulatedMeetings, CreateDialog, CreateValidationError, GuestCreateDialog, RestoredDraft, CreateSubmitting, CreateFailure, CreateSuccess, LoginRequired.

### Room and selection
RoomAvailability, RoomEveryone, RoomPeopleGap, RoomSettings, RoomNoResponses, EmptyCalendar, SingleHalfHour, DoubleHalfHour, FullDay, ManyRespondents, AlreadyJoined, CalendarMobile, CalendarDark.

### Invitation
InvitationGuest, InvitationLoading, InvitationSignedIn, InvitationJoining, InvitationBusy, InvitationInvalid, InvitationFailed, InvitationMissingToken, NameRequiredToJoin.

### Loading and errors
ListLoading, RoomLoading, ListLoadError, RoomLoadError, RouteNotFound, RouteServerError.

### Saving and connection
Saving, SaveFailed, SaveRetryRecovered, LiveConnected, ConnectionUnavailable, SessionExpiredOnSave, AccessDeniedOnSave.

## Verification detail
- Parent TypeScript pass after additions.
- Parent final static build passed for47 entries with NODE_OPTIONS=--max-old-space-size=1536; TypeScript subsequently passed. Build log: /Users/junhyeok_home/.hermes/cache/scratch/wwm-storybook-build.log.
- Parent fixed production NODE_ENV causing runtime `_jsxDEV is not a function` despite successful build.
- Parent verified real save queue with synthetic transport: pending, reject, retry then saved. LiveConnected receives a synthetic availability SSE event and asserts Live updates.
- Representative dark checks: full-day, live-connected, create-failure, settings and15-person calendar; no document horizontal overflow at tested sizes. Full-day48rows,15 respondents verified. Light calendar screenshot inspected.
- Fixture state and WWM session draft storage reset per story; no live invitation identifiers.

## Explicit boundaries / missing product UI
- OwnedMeetings is a DB-dependent async server component. Empty/populated list story fragments mirror output; they do not execute that server component. Skeletons and ServerSectionBoundary are imported real components.
- Route404/500 use actual SiteError presentation, not framework route dispatch. Invitation cases use real InvitationLanding; standalone callbacks are preview-only. AlreadyJoined represents the server-supplied room state rather than exercising authorization.
- Account-error chrome and misconfigured-service environment branch have no dedicated stories yet. Dedicated unauthorized-room UI is not implemented; save rejection message is simulated through the real error surface.
- People intentionally shows the actual unavailable-roster notice. Administrator capacity/rename, Google Calendar confirmation/invitation, and all-day/time controls not yet implemented in the application are not invented as finished screens.
- Real OAuth, DB writes, email sending, remote multi-user conflict behavior, native iOS touch and full light/dark × viewport combinations are not certified by Storybook.
- The previous pnpm 10.33.0 installation rewrote the prior lockfile format (historical note). Bun migration generated bun.lock; review diff before merge; existing dirty-tree work was not reverted. No commit/push/deploy.
