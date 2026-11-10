import { useState } from "react"
import { Loader2, MessageCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { PollCard } from "@/features/quack/components/PollCard"
import { ReplyForm } from "@/features/quack/components/ReplyForm"
import { ReplyList } from "@/features/quack/components/ReplyList"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"
import { usePollManagement } from "@/features/quack/hooks/usePollMutations"

type QuackItemProps = {
  quack: Quack
  viewerUserId?: string
  // admins may delete any quack (moderation); the server checks this again
  canModerate?: boolean
  // off on the static landing-page preview
  canReply?: boolean
}

export function QuackItem({
  quack,
  viewerUserId = "",
  canModerate = false,
  canReply = false,
}: QuackItemProps) {
  if (quack.deleted) {
    return (
      <DeletedQuackItem
        quack={quack}
        viewerUserId={viewerUserId}
        canModerate={canModerate}
      />
    )
  }

  return (
    <LiveQuackItem
      quack={quack}
      viewerUserId={viewerUserId}
      canModerate={canModerate}
      canReply={canReply}
    />
  )
}

// ADR 0001: a deleted quack is only a placeholder for the replies under it –
// no author, no text, no polls, no actions.
function DeletedQuackItem({ quack, viewerUserId, canModerate }: Omit<QuackItemProps, "canReply">) {
  return (
    <article
      aria-label="Deleted quack"
      className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0"
    >
      <div
        aria-hidden="true"
        className="size-12 shrink-0 rounded-full border border-dashed border-border"
      />
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm text-muted-foreground italic">This quack was deleted.</p>
        <ReplyList
          replies={quack.replies}
          viewerUserId={viewerUserId}
          canModerate={canModerate}
        />
      </div>
    </article>
  )
}

function LiveQuackItem({
  quack,
  viewerUserId = "",
  canModerate = false,
  canReply = false,
}: QuackItemProps) {
  const { name, username } = quack.user
  const [isReplying, setIsReplying] = useState(false)
  const mood = quack.mood
  const management = usePollManagement()
  const deleteQuack = useDeleteQuack()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const isAuthor = quack.userId === viewerUserId
  // Only a convenience: the server refuses the delete for anyone else anyway.
  const canDelete = isAuthor || canModerate
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

  const handleDelete = async () => {
    try {
      await deleteQuack.mutateAsync(quack.id)
      setIsConfirmOpen(false)
      toast.success("Quack deleted")
    } catch (error) {
      toast.error("Could not delete the quack", {
        description: error instanceof Error ? error.message : "Please try again.",
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
          {canDelete ? (
            <Dialog
              open={isConfirmOpen}
              onOpenChange={setIsConfirmOpen}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="ml-auto text-muted-foreground"
                aria-label="Delete quack"
                onClick={() => setIsConfirmOpen(true)}
              >
                <Trash2 />
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete this quack?</DialogTitle>
                  <DialogDescription>
                    {isAuthor
                      ? "Its text, mood, polls and votes are removed for everyone. Replies from others stay under a “deleted” placeholder."
                      : `You are removing @${username}'s quack as a moderator. Its text, mood, polls and votes are removed for everyone; replies stay.`}{" "}
                    This can&apos;t be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteQuack.isPending}
                    onClick={() => void handleDelete()}
                  >
                    {deleteQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
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
        <ReplyList
          replies={quack.replies}
          viewerUserId={viewerUserId}
          canModerate={canModerate}
        />
        {canReply && !isReplying ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground"
            onClick={() => setIsReplying(true)}
          >
            <MessageCircle />
            Reply
            {quack.replies.length > 0 ? ` · ${quack.replies.length}` : null}
          </Button>
        ) : null}
        {canReply && isReplying ? (
          <ReplyForm
            quackId={quack.id}
            onDone={() => setIsReplying(false)}
          />
        ) : null}
      </div>
    </article>
  )
}
