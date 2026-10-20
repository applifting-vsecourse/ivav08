import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { quackStatsQueryOptions } from "@/features/quack/api/quackStatsQueryOptions"
import { QuackStats } from "@/features/quack/components/QuackStats"

export const Route = createFileRoute("/_ProtectedPages/stats")({
  // Sends non-admins back to the feed. Only a convenience — the API itself
  // answers 403 to anyone who is not an admin.
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (session?.user.role !== "admin") throw redirect({ to: ROUTES.quacks })
  },
  component: StatsPage,
})

function StatsPage() {
  const statsQuery = useQuery(quackStatsQueryOptions())

  return (
    <>
      <Seo title="Stats" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Stats</h1>
        <QuackStats
          stats={statsQuery.data}
          isLoading={statsQuery.isLoading}
          error={statsQuery.error ?? undefined}
          onReload={() => void statsQuery.refetch()}
        />
      </section>
    </>
  )
}
