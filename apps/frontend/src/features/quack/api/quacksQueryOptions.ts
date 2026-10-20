import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys, type QuackFeedScope } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

// "mine" only asks for the signed-in user's quacks — the server reads who that
// is from the session, so no user id ever travels in the URL
function toSearchParams(search: string, scope: QuackFeedScope) {
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (scope === "mine") params.mine = "true"
  return Object.keys(params).length > 0 ? params : undefined
}

export const quacksQueryOptions = (searchTerm = "", scope: QuackFeedScope = "all") => {
  const search = searchTerm.trim()

  return queryOptions({
    queryKey: quackKeys.lists(search, scope),
    queryFn: async () =>
      quacksSchema.parse(
        await api.get("quacks", { searchParams: toSearchParams(search, scope) }).json(),
      ),
  })
}
