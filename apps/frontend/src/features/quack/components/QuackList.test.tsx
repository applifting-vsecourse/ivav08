// Example component test — the pattern to copy for your own components.
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows a selected mood and omits the label when there is no mood", () => {
    const { rerender } = render(<QuackList quacks={[quack({ mood: "silly" })]} />)

    expect(screen.getByText("Silly")).toBeInTheDocument()

    rerender(<QuackList quacks={[quack()]} />)
    expect(screen.queryByText("Silly")).not.toBeInTheDocument()
  })

  it("filters posts by text and author, ignoring case", async () => {
    render(
      <QuackList
        quacks={[
          quack({ text: "A joke about the pond" }),
          quack({
            id: "q2",
            text: "A quiet afternoon",
            user: { id: "u2", name: "Deep Duck", username: "DeepDuck" },
          }),
        ]}
      />,
    )

    const search = screen.getByRole("searchbox", { name: "Search posts" })
    await userEvent.type(search, "JOKE")

    expect(screen.getByText("A joke about the pond")).toBeInTheDocument()
    expect(screen.queryByText("A quiet afternoon")).not.toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, "DEEPDUCK")

    expect(screen.getByText("A quiet afternoon")).toBeInTheDocument()
    expect(screen.queryByText("A joke about the pond")).not.toBeInTheDocument()
  })

  it("shows a search-specific empty state when nothing matches", async () => {
    render(<QuackList quacks={[quack()]} />)

    await userEvent.type(screen.getByRole("searchbox", { name: "Search posts" }), "not here")

    expect(screen.getByText("No quacks match your search.")).toBeInTheDocument()
    expect(screen.queryByText("No quacks yet. Post the first one.")).not.toBeInTheDocument()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    render(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })
})
