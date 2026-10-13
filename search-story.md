# Search for posts

## User story

As a reader who remembers a post but not where it appears in the feed, I want to search by a word from the post or its author so I can find it again.

## Acceptance criteria

1. The feed shows a labeled search field.
2. When a reader types a non-empty term, matching results update as they type. Matching is a case-insensitive substring search over the post text, the author's display name, and the author's username. Leading and trailing whitespace is ignored.
3. Search covers all posts available to the feed, including older posts, not only posts currently visible before searching.
4. Clearing the search field restores the complete feed.
5. If the term matches no posts, the feed shows “No quacks match your search.”
6. If there are no posts and no search term, the feed keeps its normal empty state: “No quacks yet. Post the first one.”
7. While a search request is pending, the feed shows a loading indicator; if it fails, the existing error message and reload action are shown.

## Out of scope

- Exact-match, phrase-token, fuzzy, or accent-insensitive search.
- Search by mood, date, or other filters.
- Sorting, pagination, highlighting, and saved or shareable searches.
- Keeping the search term after navigating away or reloading the page.
