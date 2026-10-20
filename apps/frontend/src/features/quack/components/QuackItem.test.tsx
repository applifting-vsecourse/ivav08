import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

const { deleteQuackMock } = vi.hoisted(() => ({ deleteQuackMock: vi.fn() }))

vi.mock("@/features/quack/api/deleteQuack", () => ({
  deleteQuack: deleteQuackMock,
}))

const quack: Quack = {
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  polls: [],
}

function renderItem(viewerUserId: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <QuackItem
        quack={quack}
        viewerUserId={viewerUserId}
      />
    </QueryClientProvider>,
  )
}

describe("QuackItem deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteQuackMock.mockResolvedValue(undefined)
  })

  it("asks the author to confirm, then deletes", async () => {
    renderItem("u1")

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Delete this quack?")).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(deleteQuackMock.mock.calls[0]?.[0]).toBe("q1"))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("does nothing when the author cancels", async () => {
    renderItem("u1")

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
    )

    expect(deleteQuackMock).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("does not show the delete action to another user", () => {
    renderItem("u2")

    expect(screen.queryByRole("button", { name: "Delete quack" })).not.toBeInTheDocument()
  })
})
