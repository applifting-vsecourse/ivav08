import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LikeButton } from "@/features/quack/components/LikeButton"

const { likeQuackMock, unlikeQuackMock } = vi.hoisted(() => ({
  likeQuackMock: vi.fn(),
  unlikeQuackMock: vi.fn(),
}))

vi.mock("@/features/quack/api/likes", () => ({
  likeQuack: likeQuackMock,
  unlikeQuack: unlikeQuackMock,
}))

function renderButton(likeCount: number, isLiked: boolean) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <LikeButton
        quackId="q1"
        likeCount={likeCount}
        likedByMe={isLiked}
      />
    </QueryClientProvider>,
  )
}

// cases.md, C1–C2
describe("LikeButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    likeQuackMock.mockResolvedValue({ likeCount: 1, likedByMe: true })
    unlikeQuackMock.mockResolvedValue({ likeCount: 0, likedByMe: false })
  })

  it("C1: shows the count and that I like the quack", () => {
    renderButton(3, true)

    const button = screen.getByRole("button", { name: /^Like/ })
    expect(button).toHaveAttribute("aria-pressed", "true")
    expect(button).toHaveTextContent("3")
  })

  it("C1: shows a quack I don't like as not pressed", () => {
    renderButton(0, false)

    const button = screen.getByRole("button", { name: /^Like/ })
    expect(button).toHaveAttribute("aria-pressed", "false")
    expect(button).toHaveTextContent("0")
  })

  it("C2: clicking a quack I don't like sends the like", async () => {
    renderButton(0, false)

    await userEvent.click(screen.getByRole("button", { name: /^Like/ }))

    await waitFor(() => expect(likeQuackMock).toHaveBeenCalledWith("q1"))
    expect(unlikeQuackMock).not.toHaveBeenCalled()
  })

  it("C2: clicking a quack I like takes the like back", async () => {
    renderButton(1, true)

    await userEvent.click(screen.getByRole("button", { name: /^Like/ }))

    await waitFor(() => expect(unlikeQuackMock).toHaveBeenCalledWith("q1"))
    expect(likeQuackMock).not.toHaveBeenCalled()
  })
})
