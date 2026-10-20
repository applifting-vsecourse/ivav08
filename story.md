# Moderation: admins can delete any quack

## Problem

Someone keeps posting nasty quacks and the author won't delete them. The team needs a moderator who can remove any quack — and nothing more, for now.

## User story

As a moderator (a user with the `admin` role), I want to delete any quack, so that I can remove harmful posts when their author won't.

## Acceptance criteria

1. The moderator is the existing `admin` role. Every user has exactly one role, `user` (default) or `admin`. Users cannot set or change their own role — the role is not accepted from sign-up, settings or any request body; it is changed only directly in the database (seed / Adminer).
2. A signed-in admin sees the Delete action on **every** quack, not just their own.
3. Deleting uses the same confirmation dialog. When an admin deletes someone else's quack, the dialog says so: "You are removing @username's quack as a moderator…".
4. After confirming, the quack disappears for everyone (All, Mine, search), together with its polls and votes.
5. The server decides, using the role from the session (`if (!isOwner && !isAdmin)` in `QuacksService.deleteQuack`):
   - admin deletes anyone's quack → **204**
   - author deletes their own quack → **204** (unchanged)
   - regular user deletes someone else's quack → **403**
   - signed out → **401**
6. Regular users see no change: Delete only on their own quacks.
7. Admin-only endpoints are protected with `@Roles('admin')` + `RolesGuard` (in `apps/backend/src/shared/auth/`), running after `AuthenticatedUserGuard`. First use: `GET /api/quacks/stats` (counts of quacks, polls, votes) → 200 for admins, 403 for regular users, 401 signed out.

8. (Extra) Admins have a **Stats** item in the user menu that opens `/stats` with the number of quacks, polls and votes. Non-admins who open `/stats` are sent back to the feed (and the API answers them 403 anyway).

## Out of scope

- A separate `moderator` role (would need a new `UserRole` enum value + migration).
- A UI for assigning roles.
- Reasons for removal, notifying the author, audit log, undo.
- Banning users or hiding quacks instead of deleting.

## Checks (three accounts + Swagger)

- [ ] Admin (`admin@example.com` / `adminpassword`): Delete on every quack; deleting someone else's quack works.
- [ ] Regular user A: Delete only on own quacks.
- [ ] Regular user B: `DELETE /api/quacks/{A's quack}` in Swagger → 403.
- [ ] Signed out: → 401.
- [ ] `GET /api/quacks/stats`: admin 200, user 403.
- [ ] E2E `moderation.spec.ts` passes, and fails when `isAdmin` is removed from the service check.
