# 0002 · Likes are rows, the count is derived

- **Status:** Accepted (2026-11-24)
- **Deciders:** Valeriia Ivanova

## Context

Quacks get likes ([cases.md](../../cases.md)). A signed-in user can like a quack once and take the like back; every quack in the feed shows its like count and whether the viewer likes it. Deleted quacks are tombstones ([ADR 0001](0001-delete-content-as-tombstone.md)), so their likes have to go together with their content.

Two requests from the same user (double click, two tabs) must never count twice, and the count must never drift from who actually liked. Poll votes already solved the same problem with one row per vote and a unique constraint (see `CLAUDE.md`, "Poll vote counts").

## Decision

A `like` table: one row per `(quackId, userId)` with a database unique constraint. The count is `COUNT(*)` of those rows (Prisma `_count`), and `likedByMe` is whether a row for the viewer exists. Both are returned with every quack.

- Like = upsert of my row; liking twice is a no-op (idempotent `PUT`).
- Unlike = delete of my row; nothing to delete is not an error (idempotent `DELETE`).
- Deleting a quack removes its like rows in the same transaction as the rest of its content; the tombstone always shows 0 and refuses new likes (404).
- Rows cascade when the quack or the user is removed.

## Options considered

1. **`like` table with a unique constraint, count derived (chosen).**
   - The database guarantees one like per user; no race can double-count.
   - The count can't drift — it is always what is stored.
   - "Did I like it", "who liked it" (the bonus list of likers) come for free.
     − Every feed read counts rows. Fine at our size; an index on `quackId` (from the unique key) keeps it cheap.
2. **A `likeCount` column on `quack`, incremented and decremented.** Rejected: it can't answer "did I like it", so it can't stop the same user liking twice, and concurrent `+1/-1` updates or a failed request leave the number wrong with no way to recompute it.
3. **Both: the table plus a cached counter on `quack`.** Rejected for now: two sources of truth that every write must keep in sync in a transaction. Worth it only if counting rows becomes slow; it can be added later from the table, while the reverse (recovering who liked from a bare counter) is impossible.

## Consequences

- New additive migration (`like` table) — safe on the production database; existing quacks start at 0 likes.
- The quack API grows two fields, `likeCount` and `likedByMe`; the frontend schema follows.
- Hard to change later: the table is the source of truth. Switching to a counter-only design would lose who liked what.
- Likes on replies are out of scope; they would need their own table (or a second nullable foreign key) and a new ADR.
