import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QuackForm } from "@/features/quack/components/QuackForm"

type AddQuackInput = {
  text?: string
  mood?: string
  polls?: { question: string; options: string[] }[]
}

const mocks = vi.hoisted(() => ({
  mutate: vi.fn<(input: AddQuackInput, options?: { onSuccess?: () => void }) => void>(),
}))

vi.mock("@/features/quack/hooks/useAddQuack", () => ({
  useAddQuack: () => ({ mutate: mocks.mutate, error: null, isPending: false }),
}))

describe("QuackForm", () => {
  beforeEach(() => mocks.mutate.mockClear())

  it("preselects the user's default mood", () => {
    render(<QuackForm defaultMood="angry" />)

    expect(screen.getByRole("combobox", { name: "Mood" })).toHaveTextContent("Angry")
  })

  it("defaults to no mood when the user has not chosen one", () => {
    render(<QuackForm />)

    expect(screen.getByRole("combobox", { name: "Mood" })).toHaveTextContent("No mood")
  })

  it("submits a poll-only post with its question and answers", async () => {
    render(<QuackForm />)

    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    await userEvent.type(screen.getByRole("textbox", { name: "Poll question" }), "Where to go?")
    await userEvent.type(screen.getByRole("textbox", { name: "Answer 1" }), "Cafe")
    await userEvent.type(screen.getByRole("textbox", { name: "Answer 2" }), "Park")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(mocks.mutate.mock.calls[0]?.[0]).toEqual({
      text: undefined,
      mood: undefined,
      polls: [{ question: "Where to go?", options: ["Cafe", "Park"] }],
    })
    expect(mocks.mutate.mock.calls[0]?.[1]?.onSuccess).toBeTypeOf("function")
  })

  it("rejects duplicate answers before sending the post", async () => {
    render(<QuackForm />)

    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    await userEvent.type(screen.getByRole("textbox", { name: "Poll question" }), "Where to go?")
    await userEvent.type(screen.getByRole("textbox", { name: "Answer 1" }), "Cafe")
    await userEvent.type(screen.getByRole("textbox", { name: "Answer 2" }), " cafe ")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(await screen.findByText("Answers must be unique")).toBeInTheDocument()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it("limits a post to three polls", async () => {
    render(<QuackForm />)

    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))

    expect(screen.getAllByText(/^Poll [1-3]$/)).toHaveLength(3)
    expect(screen.queryByRole("button", { name: "Add poll" })).not.toBeInTheDocument()
  })

  it("limits each poll to six answers", async () => {
    render(<QuackForm />)
    await userEvent.click(screen.getByRole("button", { name: "Add poll" }))

    for (let answer = 0; answer < 4; answer += 1) {
      await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
    }

    expect(screen.getAllByRole("textbox", { name: /^Answer/ })).toHaveLength(6)
    expect(screen.queryByRole("button", { name: "Add answer" })).not.toBeInTheDocument()
  })
})
