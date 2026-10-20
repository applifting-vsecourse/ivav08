# Delete your own quacks and the "Mine" tab

## User story

As a signed-in user, I want to delete quacks I posted and to see only my own quacks, so that I can take back a post I regret and quickly find what I wrote.

## Acceptance criteria

### Deleting

1. Each of **my own** quacks shows a Delete action (a bin icon, labelled "Delete quack" for screen readers). Quacks by other people never show it.
2. Clicking Delete opens a confirmation dialog ("Delete this quack?") with **Cancel** and **Delete**. Cancel (or Esc / clicking outside) closes it and nothing changes.
3. Confirming deletes the quack. It disappears from every feed (All, Mine, search results) without a page reload, and stays gone after a reload. Its polls and votes are deleted with it.
4. While the delete is in progress the Delete button is disabled and shows a spinner. On success a short "Quack deleted" toast appears; on failure an error toast explains what went wrong and the quack stays.
5. The server enforces ownership, not just the UI:
   - `DELETE /api/quacks/:id` for my own quack → **204**
   - someone else's quack → **403**
   - signed out → **401**
   - a quack that does not exist → **404**
6. The user is always taken from the session. No user id is sent in the URL or request body.

### All / Mine

7. Above the feed there are two tabs: **All** (default) and **Mine**.
8. **Mine** shows only quacks written by the signed-in user, newest first. The filter is done on the server (`GET /api/quacks?mine=true`), so it also works together with search.
9. When Mine is empty (and nothing is being searched), it says "You haven't posted any quacks yet. Yours will show up here." with a **Write your first quack** button that moves the cursor into the post form.
10. When a search inside Mine finds nothing, the usual "No quacks match your search." is shown.

### Unchanged

11. Signed-out visitors still cannot reach the feed; they are redirected to the login page.

## Out of scope

- Editing quacks.
- Undo / restoring a deleted quack (soft delete).
- Moderators/admins deleting other people's quacks (separate story).
- Remembering the selected tab in the URL or across reloads.
- Viewing another user's quacks (profile pages).

## Checks (in the browser)

- [ ] Two windows, two accounts: Delete appears only on my own quacks.
- [ ] Cancel in the dialog leaves the quack in place.
- [ ] Confirm removes it immediately and after reload.
- [ ] Swagger: `DELETE` someone else's quack → 403; signed out → 401.
- [ ] Mine shows only my quacks; empty Mine shows the invitation; the button focuses the form.
- [ ] No `userId` in any URL or request body (DevTools → Network).
