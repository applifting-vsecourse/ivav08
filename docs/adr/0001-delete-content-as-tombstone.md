# 0001 · Deleted content becomes a tombstone

- **Status:** Accepted
- **Date:** 2026-11-10
- **Story:** [Replies to quacks](../../story.md)

## Context

Quacker is getting replies. Replies belong to their authors, so when someone deletes a quack that already has replies, those replies must stay – and they need something to hang under. At the same time the product owner requires that deleted content **really disappears** from the app: not in the feed, not in replies, not in search.

Until now (week 5) a quack was removed with a hard `DELETE`, and its polls and votes went with it. That no longer works once other people's replies point at the quack.

This decision affects every place that reads quacks (feed, search, Mine, stats, polls, future features), so it is hard to undo.

## Decision

Deleting a quack turns it into a **tombstone**. In one transaction we:

1. set `quack.deletedAt` to now,
2. wipe the content: `text` = `''`, `mood` = `NULL`,
3. delete its polls (options and votes go with them).

The row and its id stay, so replies keep pointing at it. Every read of quacks must respect `deletedAt`:

- the feed shows a deleted quack only if it has replies, as a placeholder "This quack was deleted" without author, text, polls or actions;
- search, Mine and stats never include deleted quacks;
- you can't reply to a deleted quack, and deleting it again returns 404.

Replies themselves have nothing under them and are removed with a hard `DELETE`.

## Options considered

- **Tombstone: soft delete + wipe content (chosen).** Content is gone from the database, the conversation keeps its shape, one code path for all deletes.
- **Hard delete, replies become orphans** (`reply.quackId` set to `NULL`). Rejected: replies lose their context and the UI can't show what they answered.
- **Block the delete while the quack has replies.** Rejected: the author couldn't remove their own content, which breaks the product requirement.
- **Plain soft delete** (only `deletedAt`, keep the text). Rejected: the text stays in the database, and one forgotten `deletedAt` filter would show it again – the requirement says it must really disappear.
- **Hard delete when there are no replies, tombstone otherwise.** Rejected: two code paths and a race when a reply arrives during the delete; empty tombstone rows are cheap.

## Consequences

- Every new query on `quack` must decide what to do with `deletedAt` (usually filter `deletedAt: null`). This is the main cost of the decision – check it in review.
- The `quack` table keeps empty rows for deleted quacks. They hold no user content, only ids, the author id and timestamps.
- `onDelete: Cascade` from quack to reply now only matters when a quack row is really removed (deleting a user). If account deletion is added, it needs its own decision about other people's replies.
- Undo ("restore quack") is impossible by design: the content is gone.
