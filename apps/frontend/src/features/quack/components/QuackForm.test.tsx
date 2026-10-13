import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/hooks/useAddQuack", () => ({
  useAddQuack: () => ({ mutate: vi.fn(), error: null, isPending: false }),
}))

describe("QuackForm", () => {
  it("preselects the user's default mood", () => {
    render(<QuackForm defaultMood="angry" />)

    expect(screen.getByRole("combobox", { name: "Mood" })).toHaveTextContent("Angry")
  })

  it("defaults to no mood when the user has not chosen one", () => {
    render(<QuackForm />)

    expect(screen.getByRole("combobox", { name: "Mood" })).toHaveTextContent("No mood")
  })
})
