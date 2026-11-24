import type { QuackLikes } from "@/features/quack/api/quackSchemas"

// TODO(likes): PUT/DELETE quacks/:id/like (red phase stub)
export function likeQuack(quackId: string): Promise<QuackLikes> {
  return Promise.reject(new Error(`not implemented (${quackId})`))
}

export function unlikeQuack(quackId: string): Promise<QuackLikes> {
  return Promise.reject(new Error(`not implemented (${quackId})`))
}
