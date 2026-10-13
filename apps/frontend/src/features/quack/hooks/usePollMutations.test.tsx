import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { castPollVote } from "@/features/quack/api/pollActions"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { usePollVote } from "@/features/quack/hooks/usePollMutations"

vi.mock("@/features/quack/api/pollActions", () => ({
  castPollVote: vi.fn(),
  cancelPollVote: vi.fn(),
  setPollStatus: vi.fn(),
  setQuackPollStatus: vi.fn(),
  updatePoll: vi.fn(),
}))

const quack: Quack = {
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "author",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "author", name: "Author", username: "author" },
  polls: [
    {
      id: "p1",
      question: "Where?",
      status: "open",
      resultsVisible: true,
      myVoteOptionId: "o1",
      options: [
        { id: "o1", label: "Cafe", position: 0, voteCount: 3 },
        { id: "o2", label: "Park", position: 1, voteCount: 2 },
      ],
    },
  ],
}

function createWrapper(queryClient: QueryClient) {
  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  QueryWrapper.displayName = "QueryWrapper"
  return QueryWrapper
}

describe("usePollVote", () => {
  beforeEach(() => vi.clearAllMocks())

  it("optimistically moves a visible vote and updates counts", async () => {
    vi.mocked(castPollVote).mockResolvedValue({ success: true })
    const queryClient = new QueryClient()
    queryClient.setQueryData(quackKeys.lists(), [quack])
    const { result } = renderHook(() => usePollVote(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ pollId: "p1", optionId: "o2", viewerUserId: "reader" })
    })

    const updated = queryClient.getQueryData<Quack[]>(quackKeys.lists())?.[0]?.polls[0]
    expect(updated?.myVoteOptionId).toBe("o2")
    expect(updated?.options.map((option) => option.voteCount)).toEqual([2, 3])
  })

  it("restores the saved vote and counts after a rejected request", async () => {
    vi.mocked(castPollVote).mockRejectedValue(new Error("Network unavailable"))
    const queryClient = new QueryClient()
    queryClient.setQueryData(quackKeys.lists(), [quack])
    const { result } = renderHook(() => usePollVote(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ pollId: "p1", optionId: "o2", viewerUserId: "reader" }),
      ).rejects.toThrow("Network unavailable")
    })

    const restored = queryClient.getQueryData<Quack[]>(quackKeys.lists())?.[0]?.polls[0]
    expect(restored?.myVoteOptionId).toBe("o1")
    expect(restored?.options.map((option) => option.voteCount)).toEqual([3, 2])
  })

  it("keeps first-vote results hidden until the server confirms the vote", async () => {
    let confirmVote: ((response: { success: true }) => void) | undefined
    vi.mocked(castPollVote).mockImplementation(
      () =>
        new Promise((resolve) => {
          confirmVote = resolve
        }),
    )
    const queryClient = new QueryClient()
    const originalPoll = quack.polls[0]
    if (!originalPoll) throw new Error("Expected a poll fixture")
    const unvotedQuack: Quack = {
      ...quack,
      polls: [
        {
          ...originalPoll,
          resultsVisible: false,
          myVoteOptionId: null,
          options: originalPoll.options.map((option) => ({ ...option, voteCount: null })),
        },
      ],
    }
    queryClient.setQueryData(quackKeys.lists(), [unvotedQuack])
    const { result } = renderHook(() => usePollVote(), { wrapper: createWrapper(queryClient) })
    let mutation: Promise<{ success: true } | void> | undefined

    await act(async () => {
      mutation = result.current.mutateAsync({
        pollId: "p1",
        optionId: "o2",
        viewerUserId: "reader",
      })
      await waitFor(() => {
        const poll = queryClient.getQueryData<Quack[]>(quackKeys.lists())?.[0]?.polls[0]
        expect(poll?.myVoteOptionId).toBe("o2")
      })
    })

    const pendingPoll = queryClient.getQueryData<Quack[]>(quackKeys.lists())?.[0]?.polls[0]
    expect(pendingPoll?.resultsVisible).toBe(false)
    expect(pendingPoll?.options.map((option) => option.voteCount)).toEqual([null, null])

    await act(async () => {
      confirmVote?.({ success: true })
      await mutation
    })
  })
})
