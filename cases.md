# Likes — cases

A signed-in user can like a quack and take the like back. Every quack shows how many people like it and whether I am one of them.

Decisions behind these cases (agreed before any code):

- Likes are stored one row per user and quack; the count is derived from those rows ([ADR 0002](docs/adr/0002-likes.md)).
- You may like your own quack.
- A deleted quack (tombstone, [ADR 0001](docs/adr/0001-delete-content-as-tombstone.md)) loses its likes together with its content, and it cannot be liked any more.
- The feed shows the number of likes and whether I liked the quack (filled heart); the heart toggles.
- Only quacks can be liked, not replies.
- Liking twice is not an error and does not count twice; taking back a like I never gave is not an error either.
- Signed out → 401, unknown or deleted quack → 404.

API: `PUT /api/quacks/:id/like` and `DELETE /api/quacks/:id/like`, both answer `200 { likeCount, likedByMe }`. Every quack in `GET /api/quacks` carries `likeCount` and `likedByMe`.

## Rules — unit tests (`likes.service.spec.ts`, repository mocked)

**U1 — liking saves my like and returns the new state**
Given a quack that exists and is not deleted
When I like it
Then the like is saved for me (the user from the session) and I get back its like count and `likedByMe: true`

**U2 — a quack that doesn't exist can't be liked**
Given no quack with that id
When I like it
Then I get "not found" and nothing is saved

**U3 — a deleted quack can't be liked**
Given a quack that was deleted
When I like it
Then I get "not found" and nothing is saved

**U4 — unliking removes my like and returns the new state**
Given a quack that exists and is not deleted
When I take my like back
Then my like is removed and I get back its like count and `likedByMe: false`

**U5 — a missing or deleted quack can't be unliked**
Given no quack with that id, or a deleted one
When I take my like back
Then I get "not found" and nothing is removed

## API — integration tests (`likes.int-spec.ts`, real app + quacker_test)

**I1 — signed out**
Given I am not signed in
When I like or unlike a quack
Then I get 401

**I2 — I like a quack, the count goes from 0 to 1**
Given a new quack with 0 likes
When I like it
Then the response is `{ likeCount: 1, likedByMe: true }`
And in the feed the quack has `likeCount: 1, likedByMe: true` for me and `likeCount: 1, likedByMe: false` for another user

**I3 — liking twice counts once**
Given I already like a quack
When I like it again
Then I get 200 and `likeCount` stays 1

**I4 — likes from different users add up**
Given two users
When both like the same quack
Then its `likeCount` is 2

**I5 — unlike**
Given I like a quack
When I take the like back
Then the response is `{ likeCount: 0, likedByMe: false }` and the feed shows 0

**I6 — unlike without a like is fine**
Given I don't like a quack
When I take a like back
Then I get 200 and `{ likeCount: 0, likedByMe: false }`

**I7 — my own quack**
Given a quack I wrote
When I like it
Then `likeCount` is 1

**I8 — unknown quack**
Given no quack with that id
When I like or unlike it
Then I get 404

**I9 — a deleted quack loses its likes and can't be liked**
Given a quack with a like and a reply, which its author then deletes
When the feed loads
Then the placeholder shows `likeCount: 0, likedByMe: false`
And liking or unliking it gives 404

**I10 — a new quack starts at zero**
Given I post a quack
When the feed loads
Then it has `likeCount: 0, likedByMe: false`

## UI — component test (`LikeButton.test.tsx`)

**C1 — shows the count and my state**
Given a quack with 3 likes that I like
When it renders
Then the "Like" button shows 3 and is pressed

**C2 — clicking toggles**
Given a quack I don't like
When I click the heart
Then the like request is sent; and given one I do like, clicking sends the unlike request

## End to end — Playwright (`e2e/likes.spec.ts`)

**E1 — sign in, like, see 1**
Given I am signed in and post a new quack
When I click its heart
Then the heart is pressed and shows 1, and it still does after a reload
When another duck opens the feed
Then they see 1 with the heart not pressed
When I click my heart again
Then it shows 0 and is not pressed
