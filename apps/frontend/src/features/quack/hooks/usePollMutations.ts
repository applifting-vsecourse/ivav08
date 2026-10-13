import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  cancelPollVote,
  castPollVote,
  setPollStatus,
  setQuackPollStatus,
  updatePoll,
  type PollOptionInput,
} from "@/features/quack/api/pollActions"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"

type VoteInput = {
  pollId: string
  optionId: string | null
  viewerUserId: string
}

type VoteContext = { previous: [QueryKey, Quack[] | undefined][] }

function updateVoteCache(quacks: Quack[], input: VoteInput) {
  return quacks.map((quack) => ({
    ...quack,
    polls: quack.polls.map((poll) => {
      if (poll.id !== input.pollId) return poll

      const isAuthor = quack.userId === input.viewerUserId
      const currentVote = poll.myVoteOptionId
      const canAdjustCounts = poll.resultsVisible
      const shouldShowResults = poll.resultsVisible || isAuthor || poll.status === "closed"

      return {
        ...poll,
        myVoteOptionId: input.optionId,
        resultsVisible: shouldShowResults,
        options: poll.options.map((option) => {
          if (!canAdjustCounts || !shouldShowResults || option.voteCount === null) {
            return {
              ...option,
              voteCount: shouldShowResults ? option.voteCount : null,
            }
          }

          let delta = 0
          if (currentVote === option.id) delta -= 1
          if (input.optionId === option.id) delta += 1
          return { ...option, voteCount: option.voteCount + delta }
        }),
      }
    }),
  }))
}

export function usePollVote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pollId, optionId }: VoteInput) =>
      optionId ? castPollVote(pollId, optionId) : cancelPollVote(pollId),
    onMutate: async (input): Promise<VoteContext> => {
      await queryClient.cancelQueries({ queryKey: quackKeys.all() })
      const previous = queryClient.getQueriesData<Quack[]>({ queryKey: quackKeys.all() })
      queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.all() }, (quacks) =>
        quacks ? updateVoteCache(quacks, input) : quacks,
      )
      return { previous }
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
      toast.error("Your vote was not saved", {
        description: "Your previous selection was restored. Please try again.",
      })
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}

export function usePollManagement() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: quackKeys.all() })

  const edit = useMutation({
    mutationFn: ({
      pollId,
      question,
      options,
    }: {
      pollId: string
      question: string
      options: PollOptionInput[]
    }) => updatePoll(pollId, { question, options }),
    onSuccess: invalidate,
  })

  const updatePollStatus = useMutation({
    mutationFn: ({ pollId, status }: { pollId: string; status: "open" | "closed" }) =>
      setPollStatus(pollId, status),
    onSuccess: invalidate,
  })

  const updateQuackPollsStatus = useMutation({
    mutationFn: ({ quackId, status }: { quackId: string; status: "open" | "closed" }) =>
      setQuackPollStatus(quackId, status),
    onSuccess: invalidate,
  })

  return { edit, updatePollStatus, updateQuackPollsStatus }
}
