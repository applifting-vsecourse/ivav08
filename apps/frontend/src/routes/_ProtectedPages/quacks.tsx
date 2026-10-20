import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { useSession } from "@/features/auth/hooks/useSession"
import type { QuackFeedScope } from "@/features/quack/api/quackKeys"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  component: QuacksPage,
})

const SEARCH_DEBOUNCE_MS = 250

function QuacksPage() {
  const { user } = useSession()
  const [searchTerm, setSearchTerm] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [scope, setScope] = useState<QuackFeedScope>("all")

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(searchTerm.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [searchTerm])

  const quacksQuery = useQuery(quacksQueryOptions(searchQuery, scope))

  // The post form sits right above the feed, so "write your first quack"
  // just moves the cursor into it.
  const focusQuackForm = () => {
    document.querySelector<HTMLTextAreaElement>('textarea[name="text"]')?.focus()
  }

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          className="mb-4"
          defaultMood={user?.defaultMood}
        />

        <QuackList
          quacks={quacksQuery.data ?? []}
          viewerUserId={user?.id}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          isLoading={quacksQuery.isLoading}
          error={quacksQuery.error ?? undefined}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
          scope={scope}
          onScopeChange={setScope}
          onWriteFirst={focusQuackForm}
          // only shows the Delete buttons — the API enforces the admin role itself
          canModerate={user?.role === "admin"}
        />
      </section>
    </>
  )
}
