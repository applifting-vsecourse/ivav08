import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { PollCard } from "@/features/quack/components/PollCard"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { usePollManagement } from "@/features/quack/hooks/usePollMutations"

type QuackItemProps = { quack: Quack; viewerUserId?: string }

export function QuackItem({ quack, viewerUserId = "" }: QuackItemProps) {
  const { name, username } = quack.user
  const mood = quack.mood
  const management = usePollManagement()
  const isAuthor = quack.userId === viewerUserId
  const isAllPollsClosed =
    quack.polls.length > 0 && quack.polls.every((poll) => poll.status === "closed")

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const handleBulkStatus = async () => {
    try {
      await management.updateQuackPollsStatus.mutateAsync({
        quackId: quack.id,
        status: isAllPollsClosed ? "open" : "closed",
      })
    } catch {
      toast.error("Could not update poll status", {
        description: "No polls on this post were changed. Please try again.",
      })
    }
  }

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      <Avatar className="size-12">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName name={name} /> <UsersUserName username={username} />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
        </div>
        {quack.text ? (
          <p className="text-sm break-words whitespace-pre-line">{quack.text}</p>
        ) : null}
        {mood ? (
          <span className="w-fit rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {mood.charAt(0).toUpperCase() + mood.slice(1)}
          </span>
        ) : null}
        {quack.polls.length > 1 && isAuthor ? (
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={management.updateQuackPollsStatus.isPending}
              onClick={() => void handleBulkStatus()}
            >
              {isAllPollsClosed ? "Reopen all polls" : "Close all polls"}
            </Button>
          </div>
        ) : null}
        {quack.polls.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            isAuthor={isAuthor}
            viewerUserId={viewerUserId}
          />
        ))}
      </div>
    </article>
  )
}
