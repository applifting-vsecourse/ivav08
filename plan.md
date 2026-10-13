# Polls implementation plan

## Product decisions

- A poll is part of a regular post. A post can have optional context text and up to three polls; without a poll, post text remains required.
- Each poll has a separate required question (up to 280 characters) and 2–6 required options (up to 80 characters each). Trim text and reject duplicate options case-insensitively.
- Signed-in users, including the post author, can cast one single-choice vote per poll. A vote can be switched or cancelled while the poll is open.
- The author always sees counts. Other users see counts after voting. Closing makes results public; reopening restores the per-user visibility rule.
- Authors can edit polls while open or closed. Keep option IDs stable so renaming preserves votes. An option with votes cannot be deleted; an unused option can be deleted only if at least two options remain. Additions are allowed up to six options.
- Authors can close/reopen one poll or all polls on their post. These actions are reversible. Only the post author may edit or change poll status.
- Vote selection is optimistic in the UI, with rollback and an actionable error on failure. Adjust counts optimistically only when they are already visible; after a first vote, reveal counts from the server response/refetch rather than guessing hidden totals.

## Data model

Keep `Quack` as the feed post and add a one-to-many relation to `Poll`. A poll belongs to exactly one quack; a quack may have zero to three polls. The existing `Quack.text` column remains non-null: store an empty string only for a poll post with no context, and keep ordinary text posts non-empty.

Add `Poll` with an ID, `quackId` foreign key, question, open/closed state, and timestamps. Deleting its parent quack cascades to its polls.

Add `PollOption` with an ID, `pollId` foreign key, label, and stable position. Keep option IDs when editing labels so vote records and counts remain attached. Enforce unique positions per poll. Deleting an option with votes is rejected by the service and restricted by its vote relation; remove unused options transactionally.

Add `PollVote` with foreign keys to `Poll`, `PollOption`, and `User`, plus timestamps. **Enforce one vote per person per poll in PostgreSQL with `UNIQUE (pollId, userId)`.** Use an upsert for switching a vote and delete the row for cancellation. This constraint is the concurrency-safe invariant; do not maintain counters on poll or option rows.

Check that the selected option belongs to the requested poll in the service before writing a vote. Derive counts from persisted vote rows with grouped counts, so reloads and concurrent updates cannot leave stale counters. Use transactions for voting, editing options, and bulk status changes; preserve foreign-key restrictions if a vote races with option removal.

## Endpoints

- `GET /api/quacks`: return posts with their polls and options, the current user's selected option, and result counts only when that viewer may see them.
- `POST /api/quacks`: create a normal post or a post with one to three polls; validate text/context, each question, option count, option text, and duplicates in the service/DTO boundary.
- `POST /api/polls/:pollId/vote`: create or switch the signed-in user's vote. Reject closed polls and options that do not belong to the poll.
- `DELETE /api/polls/:pollId/vote`: cancel the signed-in user's vote while the poll is open.
- `PATCH /api/polls/:pollId`: author-only edit of question/options. Preserve option IDs and votes; reject removal of voted options.
- `PATCH /api/polls/:pollId/status`: author-only open/close one poll.
- `PATCH /api/quacks/:quackId/polls/status`: author-only open/close all polls on one post in one transaction.

For result visibility, derive `resultsVisible` from server-side identity and poll state: true for the author, a viewer with a vote, or any viewer when closed. Never send hidden counts and rely only on CSS to conceal them.

## Build order

1. Add Prisma models, relation fields, indexes, and the unique vote constraint. Create/apply the migration and review the schema before poll endpoints exist.
2. Implement poll creation and listing, validation, authorization, and response mapping. Add repository/service tests for limits, ownership, result visibility, and empty poll results.
3. Implement vote, switch, and cancel operations using the unique constraint, option ownership check, and transactions. Test open/closed behavior and the conflict-safe upsert path.
4. Implement poll edits and per-poll/bulk close/reopen. Test stable option IDs, vote-preserving label changes, and rejection of deleting voted options.
5. Add client schemas and query/mutation helpers, then extend the post composer with poll blocks and the feed with options, counts, author controls, and single-choice voting.
6. Add optimistic selection and, only where counts are visible, optimistic count updates with rollback/error feedback. Invalidate/refetch after successful mutations. Test form validation, hidden/public result states, editing, close/reopen, switching, and cancelling.
7. Run `pnpm check-all`, apply the migration, and verify with two production accounts: create a post with polls, vote from the second account, reload as the author, switch/cancel votes, and confirm counts and visibility for both accounts.

## Out of scope

- Anonymous or multi-select voting, scheduled/automatic closing, percentage charts, poll deletion, and editing the ordinary post context after publication.
- Pagination or search changes for polls beyond including poll question/option text in the existing search only if explicitly requested later.
