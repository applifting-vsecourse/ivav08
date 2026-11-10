import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Quack, Reply } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

const { addReplyMock, deleteReplyMock } = vi.hoisted(() => ({
  addReplyMock: vi.fn(),
  deleteReplyMock: vi.fn(),
}))

vi.mock("@/features/quack/api/replies", () => ({
  addReply: addReplyMock,
  deleteReply: deleteReplyMock,
}))

const reply: Reply = {
  id: "r1",
  text: "Same here!",
  quackId: "q1",
  userId: "u2",
  createdAt: new Date("2026-01-01T12:30:00Z"),
  user: { id: "u2", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" },
}

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  polls: [],
  deleted: false,
  replies: [],
  ...overrides,
})

function renderItem(quack: Quack, viewerUserId = "u3", canModerate = false) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <QuackItem
        quack={quack}
        viewerUserId={viewerUserId}
        canModerate={canModerate}
        canReply
      />
    </QueryClientProvider>,
  )
}

describe("QuackItem replies", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addReplyMock.mockResolvedValue(reply)
    deleteReplyMock.mockResolvedValue(undefined)
  })

  it("shows the replies under the quack", () => {
    renderItem(aQuack({ replies: [reply] }))

    const replies = screen.getByRole("list", { name: "Replies" })
    expect(within(replies).getByText("Same here!")).toBeInTheDocument()
    expect(within(replies).getByText(/DeepDuckThoughts/)).toBeInTheDocument()
  })

  it("sends a trimmed reply and closes the form", async () => {
    renderItem(aQuack())

    await userEvent.click(screen.getByRole("button", { name: /^Reply/ }))
    await userEvent.type(screen.getByLabelText("Your reply"), "  Same here!  ")
    await userEvent.click(screen.getByRole("button", { name: "Reply" }))

    await waitFor(() =>
      expect(addReplyMock.mock.calls[0]?.[0]).toEqual({ quackId: "q1", text: "Same here!" }),
    )
    await waitFor(() => expect(screen.queryByLabelText("Your reply")).not.toBeInTheDocument())
  })

  it("does not send an empty reply", async () => {
    renderItem(aQuack())

    await userEvent.click(screen.getByRole("button", { name: /^Reply/ }))
    await userEvent.type(screen.getByLabelText("Your reply"), "   ")

    expect(screen.getByRole("button", { name: "Reply" })).toBeDisabled()
  })

  it("offers Delete only on the viewer's own reply", () => {
    renderItem(aQuack({ replies: [reply] }), "u2")
    expect(screen.getByRole("button", { name: "Delete reply" })).toBeInTheDocument()
  })

  it("hides Delete on someone else's reply", () => {
    renderItem(aQuack({ replies: [reply] }), "u3")
    expect(screen.queryByRole("button", { name: "Delete reply" })).not.toBeInTheDocument()
  })

  it("shows a deleted quack only as a placeholder for its replies", () => {
    renderItem(
      aQuack({
        deleted: true,
        text: "",
        user: { id: "u1", name: "Gone", username: "gone" },
        replies: [reply],
      }),
      "u1",
    )

    const article = screen.getByRole("article", { name: "Deleted quack" })
    expect(within(article).getByText("This quack was deleted.")).toBeInTheDocument()
    expect(within(article).getByText("Same here!")).toBeInTheDocument()
    // no author, no actions on the tombstone itself
    expect(within(article).queryByText(/@gone/)).not.toBeInTheDocument()
    expect(within(article).queryByRole("button", { name: "Delete quack" })).not.toBeInTheDocument()
    expect(within(article).queryByRole("button", { name: /^Reply/ })).not.toBeInTheDocument()
  })
})
