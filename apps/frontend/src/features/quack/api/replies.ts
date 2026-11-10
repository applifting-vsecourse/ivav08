import { api } from "@/lib/api-client"

import { replySchema, type Reply } from "@/features/quack/api/quackSchemas"

export async function addReply(input: { quackId: string; text: string }): Promise<Reply> {
  return replySchema.parse(
    await api.post(`quacks/${input.quackId}/replies`, { json: { text: input.text } }).json(),
  )
}

export async function deleteReply(replyId: string): Promise<void> {
  await api.delete(`replies/${replyId}`)
}
