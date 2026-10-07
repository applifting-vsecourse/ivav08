import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"

vi.mock("@/lib/api-client", () => ({ api: { get: vi.fn() } }))

describe("quacksQueryOptions", () => {
  const json = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    json.mockResolvedValue([])
    vi.mocked(api.get).mockReturnValue({ json } as never)
  })

  it("sends the trimmed search term to the API", async () => {
    const queryClient = new QueryClient()

    await queryClient.fetchQuery(quacksQueryOptions("  pond  "))

    expect(api.get).toHaveBeenCalledWith("quacks", {
      searchParams: { search: "pond" },
    })
  })

  it("omits the search parameter when the term is blank", async () => {
    const queryClient = new QueryClient()

    await queryClient.fetchQuery(quacksQueryOptions("  "))

    expect(api.get).toHaveBeenCalledWith("quacks", { searchParams: undefined })
  })
})
