import { z } from "zod"

import { QUACK_MOODS } from "@/lib/quack-moods"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

export const pollOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  position: z.number(),
  voteCount: z.number().nullable(),
})

export const pollSchema = z.object({
  id: z.string(),
  question: z.string(),
  status: z.enum(["open", "closed"]),
  resultsVisible: z.boolean(),
  myVoteOptionId: z.string().nullable(),
  options: z.array(pollOptionSchema),
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: z.enum(QUACK_MOODS).nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  polls: z.array(pollSchema),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
export type Poll = z.infer<typeof pollSchema>
export type PollOption = z.infer<typeof pollOptionSchema>
export type { QuackMood } from "@/lib/quack-moods"
