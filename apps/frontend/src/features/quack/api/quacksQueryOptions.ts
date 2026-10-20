import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys, type QuackFeedScope } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

export const quacksQueryOptions = (searchTerm = "", scope: QuackFeedScope = "all") => {
  const search = searchTerm.trim()
  // "mine" only asks for the signed-in user's quacks — the server reads who that
  // is from the session, so no user id ever travels in the URL
  const searchParams = {
    ...(search ? { search } : {}),
    ...(scope === "mine" ? { mine: "true" } : {}),
  }
  const hasSearchParams = Object.keys(searchParams).length > 0
  const params = hasSearchParams ? searchParams : undefined

  return queryOptions({
    queryKey: quackKeys.lists(search, scope),
    queryFn: async () =>
      quacksSchema.parse(await api.get("quacks", { searchParams: params }).json()),
  })
}
