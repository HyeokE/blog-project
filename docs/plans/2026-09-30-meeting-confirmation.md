# Meeting confirmation and Google Calendar invitations

## Status
Design decision recorded; NOT implemented or sent. Share icon is implemented and browser-verified (44×44, accessible name). No calendar event, attendee email, Google Cloud setting or hosted database change made.

## User decision
Use real Google Calendar event creation and attendee email invitations, not an ICS-only export. User initially requested a simplified calendar with drag selection. Keep Availability, Everyone and People; add a separate Confirm workflow.

## Proposed interaction
- Meeting-scoped ADMIN (existing owner_id authority) chooses the final slot. Other members can read confirmed details but cannot send or change invitations.
- Simplified week calendar: day columns, 00:00–24:00 axis, aggregate available/total counts without individual event clutter. Denominator must use authorized membership, not just saved responses. Missing responses count as not provided, not an assumed unavailable answer.
- Drag within one date in half-hour increments to propose start/end. Keyboard start/end controls provide the same selection; touch swipes remain scrolling, never accidental sending.
- Review dialog: title, date, one-line time range, timezone, organizer, exact attendee list and explicit unavailable/not-responded warnings. Choosing a range never creates an event.
- Explicit `Confirm & send invitations` submits once; pending disables duplicates, failures retain draft. Google consent return restores proposal, never auto-sends.
- After success show verified Google event link and confirmed slot. Updating/cancelling requires a separate explicit review action.

## Backend and authorization requirements
Existing app Google sign-in route has no Calendar scope request. Do not use Hermes personal CLI credentials as this multi-user service's backend.
- Add contextual Calendar authorization for the organizer only; minimum appropriate scope calendar.events.owned, verify actual granted scopes and account identity. Keep login/create/invite intents separate.
- All Google/Supabase requests through Next server APIs. CSRF/state/PKCE, room-bound return path and server owner verification required.
- Tokens only in a secure server-side credential store, never exposed to browser response payloads/logs/vault. No service-role bypass of membership authorization.
- Resolve participants from wwm_members through an approved narrowly scoped roster read. Missing attendee email must be explicit and block/exclude only through reviewed user intent; never infer from display names or expose general auth.users data.
- Persist confirmation/outbox under service-prefixed wwm_* records. Unique room confirmation/revision and deterministic Google event ID prevent duplicate events and invitations after retries. Verify an existing event after ambiguous timeout before retrying creation. Store Google ID, organizer identity, payload hash, revision, time range and status, not tokens in the confirmation record.
- Use Calendar events.insert with attendees and explicit sendUpdates=all. A successful API request is not proof of email delivery or attendee calendar auto-addition; verify event via events.get and report invitation requested, not delivered.
- Hosted SQL, OAuth console configuration and actual test invitation sending require separately reviewed exact scope/recipients. No changes authorized by this plan alone.

## Acceptance
1. Pure drag/range, DST, end24:00, keyboard/touch tests; no writes before final submit.
2. Owner/member/outsider auth tests and invalid attendee/room tests.
3. Duplicate click, timeout recovery, partial failure and retry tests.
4. OAuth cancellation/declined scope/wrong-account/return-without-auto-send tests.
5. Real test event ONLY after specific event and recipients approval, then read back ID, start/end/timezone and attendees. Verify resulting UI and cleanup with approval.

## Official references reviewed
- https://developers.google.com/workspace/calendar/api/guides/create-events
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://developers.google.com/identity/protocols/oauth2/web-server
