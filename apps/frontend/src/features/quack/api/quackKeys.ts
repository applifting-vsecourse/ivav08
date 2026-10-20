export type QuackFeedScope = "all" | "mine"

export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: (search = "", scope: QuackFeedScope = "all") =>
    [...quackKeys.all(), "list", scope, search] as const,
  stats: () => [...quackKeys.all(), "stats"] as const,
}
