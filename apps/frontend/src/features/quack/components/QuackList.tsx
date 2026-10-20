import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { QuackFeedScope } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

type QuackListProps = {
  quacks: Quack[]
  viewerUserId?: string
  searchTerm: string
  onSearchChange: (searchTerm: string) => void
  isLoading?: boolean
  error?: Error
  onReload?: () => void
  scope?: QuackFeedScope
  onScopeChange?: (scope: QuackFeedScope) => void
  onWriteFirst?: () => void
}

const isFeedScope = (value: string): value is QuackFeedScope => value === "all" || value === "mine"

export function QuackList({
  quacks,
  viewerUserId = "",
  searchTerm,
  onSearchChange,
  isLoading,
  error,
  onReload,
  scope = "all",
  onScopeChange,
  onWriteFirst,
}: QuackListProps) {
  const isSearching = searchTerm.trim().length > 0

  return (
    <div className="flex flex-col">
      {onScopeChange ? (
        <Tabs
          value={scope}
          onValueChange={(value) => {
            if (isFeedScope(value)) onScopeChange(value)
          }}
          className="mb-4"
        >
          <TabsList aria-label="Which quacks to show">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <div className="mb-4 flex flex-col gap-2">
        <label
          htmlFor="quack-search"
          className="text-sm font-medium"
        >
          Search posts
        </label>
        <Input
          id="quack-search"
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="A word or author's name"
        />
      </div>

      {isLoading && quacks.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : null}

      {error ? (
        <Alert
          variant="destructive"
          className="mb-4"
        >
          <AlertTitle>Couldn&apos;t load quacks</AlertTitle>
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
      ) : null}

      {!isLoading && !error && quacks.length === 0 ? (
        scope === "mine" && !isSearching ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t posted any quacks yet. Yours will show up here.
            </p>
            {onWriteFirst ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onWriteFirst}
              >
                Write your first quack
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isSearching
              ? "No quacks match your search."
              : "No quacks yet. Post the first one."}
          </p>
        )
      ) : null}

      {quacks.map((quack) => (
        <QuackItem
          key={quack.id}
          quack={quack}
          viewerUserId={viewerUserId}
        />
      ))}
    </div>
  )
}
