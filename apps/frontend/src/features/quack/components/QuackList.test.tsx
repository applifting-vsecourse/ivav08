// Example component test — the pattern to copy for your own components.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
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
  polls: [],
  ...overrides,
})

function renderList(ui: React.ReactNode) {
  const queryClient = new QueryClient()
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    renderList(
      <QuackList
        quacks={[quack()]}
        searchTerm=""
        onSearchChange={vi.fn()}
      />,
    )

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows a selected mood and omits the label when there is no mood", () => {
    const { rerender } = renderList(
      <QuackList
        quacks={[quack({ mood: "silly" })]}
        searchTerm=""
        onSearchChange={vi.fn()}
      />,
    )

    expect(screen.getByText("Silly")).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <QuackList
          quacks={[quack()]}
          searchTerm=""
          onSearchChange={vi.fn()}
        />
        ,
      </QueryClientProvider>,
    )
    expect(screen.queryByText("Silly")).not.toBeInTheDocument()
  })

  it("passes changed search text to the parent", () => {
    const onSearchChange = vi.fn()
    renderList(
      <QuackList
        quacks={[quack()]}
        searchTerm=""
        onSearchChange={onSearchChange}
      />,
    )

    fireEvent.change(screen.getByRole("searchbox", { name: "Search posts" }), {
      target: { value: "pond" },
    })

    expect(onSearchChange).toHaveBeenLastCalledWith("pond")
  })

  it("shows a search-specific empty state when nothing matches", () => {
    renderList(
      <QuackList
        quacks={[]}
        searchTerm="not here"
        onSearchChange={vi.fn()}
      />,
    )

    expect(screen.getByText("No quacks match your search.")).toBeInTheDocument()
    expect(screen.queryByText("No quacks yet. Post the first one.")).not.toBeInTheDocument()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    renderList(
      <QuackList
        quacks={[]}
        searchTerm=""
        onSearchChange={vi.fn()}
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
