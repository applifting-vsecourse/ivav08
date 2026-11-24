import { api } from "@/lib/api-client"

import { quackLikesSchema, type QuackLikes } from "@/features/quack/api/quackSchemas"

// Both calls are idempotent on the server (ADR 0002): liking twice counts
// once, unliking without a like is fine. Both answer with the new state.
export async function likeQuack(quackId: string): Promise<QuackLikes> {
  return quackLikesSchema.parse(await api.put(`quacks/${quackId}/like`).json())
}

export async function unlikeQuack(quackId: string): Promise<QuackLikes> {
  return quackLikesSchema.parse(await api.delete(`quacks/${quackId}/like`).json())
}
