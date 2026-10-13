import { z } from "zod"

import { QUACK_MOODS } from "@/lib/quack-moods"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: z.enum(QUACK_MOODS).nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
export type { QuackMood } from "@/lib/quack-moods"
