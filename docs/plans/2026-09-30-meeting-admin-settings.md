# Meeting-scoped ADMIN and rename settings

## User request and scope
The creator is ADMIN for that meeting and can rename it in Settings. The Supabase project is shared with other services. Do not introduce an account-wide ADMIN flag or change unrelated service tables.

## Existing schema inspected
`public.wwm_rooms.owner_id` references auth.users and is written by the authenticated create_room RPC. `public.wwm_members` has composite primary key (room_id,user_id), and creation adds the creator to membership. Joining is idempotent and creates membership, not ownership. `public.wwm_responses` separately stores availability. The existing rooms table has member-read RLS but no title-update permission in the initial migration.

## Mandatory service-prefixed database naming
Jason's standing convention: every application-owned table in the shared database must have an explicit service-name prefix. For When We Meet, retain the established `wwm_` prefix: `wwm_rooms`, `wwm_members`, `wwm_responses`; any future settings/audit tables also begin `wwm_`. Do not add ambiguous tables such as `rooms`, `members`, `settings`, or `roles`. Use the same service prefix for application RPCs, indexes, constraints and RLS policy names where practical. Platform-owned tables such as `auth.users` are referenced, not renamed. Other services keep their own distinct service prefixes. Renaming existing unrelated tables or running hosted migrations still requires separately authorized scope.

## Role source of truth
For this requested scope, effective role is ADMIN if room.owner_id = authenticated user.id, MEMBER if an authorized membership exists, otherwise no role. Keep owner_id as the sole creator/admin authority rather than storing a second role flag that can drift. Expose this role through the server-authorized room response. Do not trust a client role, profile metadata, invite query string, or saved response. ADMIN here is a WWM room role only; it grants nothing in other Craft services.

If delegated multiple admins become a product requirement later, migrate explicitly to a room-scoped role relationship with audited grants. Do not prematurely create a generic service-wide RBAC system or global role enum for a single permission.

## Rename contract
- Show Settings only for effective ADMIN. Reuse installed Dialog/Input/Button and existing Craft tokens.
- Title is trimmed, required, 1–100 characters, matching existing DB validation; preserve user-authored language.
- Explicit Save action. Show pending state, preserve the draft on failure, update room header and refresh the owned/joined list only after confirmed server success.
- A same-origin Next server endpoint authenticates the session and invokes a narrowly scoped DB operation that compares auth.uid() with room.owner_id. Do not accept owner_id/role/member changes in the payload.
- DB enforcement must independently prevent MEMBER or unrelated authenticated users from renaming even if they call the endpoint/RPC directly. A dedicated authenticated rename RPC may be preferable to broad table UPDATE grants; retain member-only room reads and Google-auth requirements.
- Missing/unauthorized resources must not leak a private title. Authentication failures, invalid title and failed updates return sanitized messages.

## Migration boundary
Prepare additive migration only if the live authorized rename path does not already exist. Never reapply or edit applied migrations, use service-role bypass, or change global Supabase/Auth policies. Hosted SQL application requires separate explicit approval; until applied and exercised, report the DB-backed feature as blocked, not complete.

## Acceptance
Creator ADMIN / joined MEMBER / outsider no role; forged role rejected; cross-room owner has no authority; owner cannot be changed through rename; empty/whitespace/overlength title rejected; existing membership/availability unchanged; successful rename appears in room and both users' authorized lists after refresh. Test UI keyboard/cancel/retry. Synthetic tests do not certify hosted RLS or a real DB update. Do not rename the user's existing test meeting during QA without approval.

## Ownership
Parent owns role design and subsequent implementation review. Invitation/joined-list changes remain a separate slice; calendar event-block implementation is parent-owned. No deployment or hosted migration is authorized by this document.
