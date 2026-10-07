import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

export const quacksQueryOptions = (searchTerm = "") => {
  const search = searchTerm.trim()

  return queryOptions({
    queryKey: quackKeys.lists(search),
    queryFn: async () =>
      quacksSchema.parse(
        await api.get("quacks", { searchParams: search ? { search } : undefined }).json(),
      ),
  })
}
