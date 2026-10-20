import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"

export const quackStatsSchema = z.object({
  quackCount: z.number(),
  pollCount: z.number(),
  voteCount: z.number(),
})

export type QuackStats = z.infer<typeof quackStatsSchema>

// Admin-only endpoint: the server answers 403 to everyone else.
export const quackStatsQueryOptions = () =>
  queryOptions({
    queryKey: quackKeys.stats(),
    queryFn: async () => quackStatsSchema.parse(await api.get("quacks/stats").json()),
  })
