# Replies to quacks

## Request (product owner)

> Users can reply to a quack and see the replies under it. Replies belong to their authors: if an author deletes a quack that has replies, the replies stay. When someone deletes their quack, its content must really disappear from the app.

## User story

As a signed-in user, I want to reply to a quack and read the replies under it, so that a quack can turn into a short conversation.
As the author of a quack, I want deleting it to really remove what I wrote, even when others have already replied.

## Acceptance criteria

### Replying

1. Under every quack that isn't deleted there is a **Reply** action. It opens a small form with one text field (1–280 characters, trimmed) and a **Reply** button.
2. After sending, the reply appears under the quack immediately (without a reload) and the form closes. An error toast explains a failure and keeps the text.
3. Replies are shown under their quack, oldest first, each with the author's name, `@username`, time and text. A quack shows how many replies it has.
4. A deleted quack cannot be replied to: the API answers **404**, the UI shows no Reply action.
5. The author is always taken from the session. Signed out → **401**.

### Deleting a quack (changes week 5)

6. Deleting a quack never removes it with a hard `DELETE`. The row stays as a **tombstone**: in one transaction its `text` becomes empty, `mood` becomes null, its polls (with options and votes) are deleted and `deletedAt` is set.
7. A deleted quack **with** replies stays in the feed as a placeholder "This quack was deleted" (no author, no text, no polls, no actions), with its replies under it.
8. A deleted quack **without** replies does not appear anywhere.
9. Deleted quacks never appear in **search** results or on the **Mine** tab, and their text is not returned by any API.
10. Deleting an already deleted quack → **404**. Permissions are unchanged from week 5: author or admin (403 otherwise, 401 signed out).

### Deleting a reply

11. The author of a reply and an admin see a delete action on it, with the same confirmation dialog. The server checks owner-or-admin (**403** otherwise, **401** signed out, **404** missing).
12. A reply is removed with a hard `DELETE` – nothing hangs under it.

### Data / production

13. The migration is additive (new `reply` table, nullable `quack.deletedAt`) and runs on the production database with existing data.
14. In production the feed shows at least one quack with replies.

## Out of scope

- Replies to replies (threads).
- Editing replies or quacks.
- Searching inside replies.
- Notifications about new replies.
- Restoring (undoing) a deleted quack.
- What happens to other people's replies when a whole user account is deleted (no account deletion in Quacker yet; today the user cascade would remove their quacks and the replies under them).

## Decisions

### D1 · How replies are stored → separate `Reply` table

- **Chosen: separate `Reply` table** (`id`, `text`, `quackId`, `userId`, `createdAt`). Feed, search, Mine and stats keep working on `quack` without new filters; a reply has no mood and no polls, so a smaller model fits. Hard to change later: moderate – threads would need a `parentReplyId` column (additive).
- Rejected: **reply = `Quack` with `parentId`**. Reuses everything and makes threads easy, but every quack query (feed, search, Mine, stats) would have to add `parentId = null`, and forgetting it once shows replies as top-level quacks. Also mood and polls would be allowed on replies.

### D2 · Deleting a quack that has replies → tombstone

- **Chosen: tombstone (soft delete + wipe).** Keep the row so replies keep their parent, but erase the content (text, mood, polls) and set `deletedAt`. The content really disappears; the conversation keeps its shape. Hard to change later: high – every read of quacks must respect `deletedAt` → recorded in [ADR 0001](docs/adr/0001-delete-content-as-tombstone.md).
- Rejected: **hard delete, replies become orphans** (`quackId` set to NULL). Replies lose their context and the UI can't show what they answer.
- Rejected: **block the delete while replies exist.** Breaks the requirement that the author's content must really disappear.
- Rejected: **plain soft delete (only `deletedAt`, keep the text).** The text would still be in the database and one forgotten filter would show it again.

### D3 · Deleting a quack without replies → same tombstone

- **Chosen: always tombstone.** One code path; a deleted quack without replies is simply filtered out of the feed.
- Rejected: hard delete when there are no replies, tombstone otherwise. Saves empty rows, but two paths to test, and a reply arriving at the same moment could race the check.

### D4 · Can replies be deleted? → yes, author or admin, hard delete

- **Chosen:** same rule as quacks (owner-or-admin, checked on the server). A reply has nothing under it, so a hard delete is safe.
- Rejected: replies can't be deleted – an offensive reply couldn't be moderated.

## Schema change

```prisma
model Quack {
  // …existing fields
  replies   Reply[]
  deletedAt DateTime?
}

model Reply {
  id        String   @id @default(cuid())
  text      String   @db.VarChar(280)
  quackId   String
  quack     Quack    @relation(fields: [quackId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([quackId, createdAt])
  @@index([userId])
  @@map("reply")
}
```

## Checklist

1. **Can everything the user sees be read with simple queries?** Yes:
   - Feed: `quack.findMany({ where: { OR: [{ deletedAt: null }, { replies: { some: {} } }] }, include: { user, polls, replies: { include: { user }, orderBy: { createdAt: 'asc' } } } })`.
   - Search / Mine: the same with `deletedAt: null` added.
   - Reply count: `replies.length` of the loaded list (or `_count.replies`).
2. **Is anything stored twice?** No. There is no reply counter; the count is derived from the `reply` rows.
3. **What happens to related rows when a quack is deleted?** The quack row stays (tombstone). Its polls, options and votes are deleted in the same transaction; replies stay. The `onDelete: Cascade` from quack to reply only fires if the quack row itself is removed (today only via deleting the user).
4. **Will the migration run on production with data?** Yes. It only adds a nullable column (`deletedAt`, existing rows = not deleted) and a new empty table. No data is rewritten and nothing is dropped.

## Code touched

- Backend `quack` module: `schema.prisma` + migration, `QuackRepository` (feed filters, tombstone delete, replies), `QuacksService.deleteQuack`, new `RepliesService` + `RepliesController` (`POST /api/quacks/:id/replies`, `DELETE /api/replies/:id`), `QuackResponseDto` (`deleted`, `replies`).
- Frontend `quack` feature: schemas, `QuackItem` (reply action, replies list, deleted placeholder), new `ReplyForm`, `ReplyList`, hooks `useAddReply`, `useDeleteReply`.
- Tests: unit (service, repository, components) and Playwright `e2e/replies.spec.ts`.
