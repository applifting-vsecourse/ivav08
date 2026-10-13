# Polls

## User story

As a user who wants to collect answers to a question, I want to add polls to a post, see reliable vote counts, and change my vote so people can decide together without counting replies by hand.

## Acceptance criteria

### Creating polls

1. A post may contain up to three polls. Each poll has its own required question and 2–6 answer options. A poll question may be up to 280 characters; each option is required, up to 80 characters, and unique within that poll after trimming and case-insensitive comparison.
2. A poll post may omit the ordinary post context. A post without polls still requires its ordinary text. The context and each question are separate fields.
3. The author can edit poll questions and options, including after votes. Editing an existing option's text preserves votes for that option. An option with votes cannot be removed; an option without votes may be removed only if at least two options remain. Options may be added up to the six-option limit.

### Voting and results

4. Any signed-in user, including the post author, can cast one vote per poll. The database prevents more than one vote for the same user and poll.
5. A user's vote persists across reloads. While a poll is open, a user can change their selected option or cancel their vote. A closed poll rejects new, changed, or cancelled votes.
6. The author always sees current counts. Other users see answer counts only after they have voted. When a poll is closed, its counts become visible to everyone.
7. Vote counts are derived from persisted votes and remain correct when concurrent users vote or change their votes.
8. Selecting an answer updates the selection immediately. If the viewer is already allowed to see counts, the affected counts update optimistically. A first-time voter sees counts after the server confirms the vote. Success refreshes authoritative results; if the server rejects the vote, the UI restores the saved selection and any visible counts and shows an actionable error.

### Closing and reopening

9. The post author can close or reopen one poll or all polls on the post. Closing is not permanent; reopening allows voting again. After reopening, non-authors who have not voted no longer see counts.
10. Closing or reopening a poll does not erase votes. Reopening and editing are available to the post author, including after a poll has been closed.

### Empty and failure states

11. A post with no poll renders as it does today. A poll with no votes shows zero counts to viewers allowed to see results. Voting, poll editing, and status changes that fail show an error without silently discarding the user's current draft or saved vote.

## Out of scope

- Anonymous voting, multi-select, scheduled polls, automatic expiry, and percentage charts.
- Deleting a poll or editing the ordinary post context after publishing.
- Polls on existing posts through a separate attach flow; poll content is created with its post.
