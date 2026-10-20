import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { QuackStats as QuackStatsData } from "@/features/quack/api/quackStatsQueryOptions"

type QuackStatsProps = {
  stats?: QuackStatsData
  isLoading?: boolean
  error?: Error
  onReload?: () => void
}

export function QuackStats({ stats, isLoading, error, onReload }: QuackStatsProps) {
  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load statistics</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{error.message}</span>
          {onReload ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onReload}
            >
              <RefreshCw className="size-4" />
              Reload
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }

  if (!stats) return null

  const items = [
    { label: "Quacks", value: stats.quackCount },
    { label: "Polls", value: stats.pollCount },
    { label: "Votes", value: stats.voteCount },
  ]

  return (
    <dl className="grid grid-cols-3 gap-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 border-b border-border pb-4"
        >
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="text-2xl font-semibold tracking-tight">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
