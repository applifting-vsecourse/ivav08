import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { PollCard } from "@/features/quack/components/PollCard"

const mocks = vi.hoisted(() => ({
  vote: vi.fn(),
  edit: vi.fn(),
  updatePollStatus: vi.fn(),
  updateQuackPollsStatus: vi.fn(),
}))

vi.mock("@/features/quack/hooks/usePollMutations", () => ({
  usePollVote: () => ({ mutate: mocks.vote, isPending: false, variables: undefined }),
  usePollManagement: () => ({
    edit: { mutateAsync: mocks.edit, isPending: false },
    updatePollStatus: { mutateAsync: mocks.updatePollStatus, isPending: false },
    updateQuackPollsStatus: { mutateAsync: mocks.updateQuackPollsStatus, isPending: false },
  }),
}))

const poll: Poll = {
  id: "p1",
  question: "Where should we go?",
  status: "open",
  resultsVisible: false,
  myVoteOptionId: null,
  options: [
    { id: "o1", label: "Cafe", position: 0, voteCount: null },
    { id: "o2", label: "Park", position: 1, voteCount: null },
  ],
}

function renderPoll(overrides: Partial<Poll> = {}, isAuthor = false) {
  return render(
    <PollCard
      poll={{ ...poll, ...overrides }}
      isAuthor={isAuthor}
      viewerUserId={isAuthor ? "author" : "reader"}
    />,
  )
}

describe("PollCard", () => {
  it("hides counts from a non-voter and sends the selected option", async () => {
    renderPoll()

    expect(screen.getByText(/Vote to see results/)).toBeInTheDocument()
    expect(screen.queryByText("3 votes")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("radio", { name: "Cafe" }))

    expect(mocks.vote).toHaveBeenCalledWith({
      pollId: "p1",
      optionId: "o1",
      viewerUserId: "reader",
    })
  })

  it("shows authoritative counts when the viewer may see results", () => {
    renderPoll({
      resultsVisible: true,
      myVoteOptionId: "o2",
      options: [
        { id: "o1", label: "Cafe", position: 0, voteCount: 3 },
        { id: "o2", label: "Park", position: 1, voteCount: 1 },
      ],
    })

    expect(screen.getByText(/4 votes/)).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("lets a voter cancel while open", async () => {
    renderPoll({ resultsVisible: true, myVoteOptionId: "o1" })

    await userEvent.click(screen.getByRole("button", { name: "Remove my vote" }))

    expect(mocks.vote).toHaveBeenCalledWith({
      pollId: "p1",
      optionId: null,
      viewerUserId: "reader",
    })
  })

  it("locks voting when closed and lets the author reopen", async () => {
    renderPoll({ status: "closed", resultsVisible: true }, true)

    expect(screen.getByRole("radio", { name: "Cafe" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Reopen poll" }))

    expect(mocks.updatePollStatus).toHaveBeenCalledWith({ pollId: "p1", status: "open" })
  })

  it("does not expose author controls to another user", () => {
    renderPoll()

    expect(screen.queryByRole("button", { name: "Close poll" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit poll" })).not.toBeInTheDocument()
  })

  it("lets the author edit the question and labels without replacing option IDs", async () => {
    renderPoll({ resultsVisible: true }, true)

    await userEvent.click(screen.getByRole("button", { name: "Edit poll" }))
    const question = screen.getByRole("textbox", { name: "Poll question" })
    await userEvent.clear(question)
    await userEvent.type(question, "Where should lunch be?")
    const firstAnswer = screen.getByRole("textbox", { name: "Answer 1" })
    await userEvent.clear(firstAnswer)
    await userEvent.type(firstAnswer, "Cafe patio")
    await userEvent.click(screen.getByRole("button", { name: "Save poll" }))

    expect(mocks.edit).toHaveBeenCalledWith({
      pollId: "p1",
      question: "Where should lunch be?",
      options: [
        { id: "o1", label: "Cafe patio" },
        { id: "o2", label: "Park" },
      ],
    })
  })
})
