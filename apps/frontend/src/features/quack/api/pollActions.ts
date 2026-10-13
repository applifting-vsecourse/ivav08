import { z } from "zod"

import { api } from "@/lib/api-client"

const voteResponseSchema = z.object({ success: z.literal(true) })

export type PollOptionInput = { id?: string; label: string }

export async function castPollVote(pollId: string, optionId: string) {
  return voteResponseSchema.parse(
    await api.post(`polls/${pollId}/vote`, { json: { optionId } }).json(),
  )
}

export async function cancelPollVote(pollId: string) {
  await api.delete(`polls/${pollId}/vote`)
}

export async function updatePoll(
  pollId: string,
  input: { question: string; options: PollOptionInput[] },
) {
  await api.patch(`polls/${pollId}`, { json: input })
}

export async function setPollStatus(pollId: string, status: "open" | "closed") {
  await api.patch(`polls/${pollId}/status`, { json: { status } })
}

export async function setQuackPollStatus(quackId: string, status: "open" | "closed") {
  await api.patch(`quacks/${quackId}/polls/status`, { json: { status } })
}
