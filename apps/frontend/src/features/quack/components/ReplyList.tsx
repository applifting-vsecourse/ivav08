import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

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

import type { Reply } from "@/features/quack/api/quackSchemas"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { useDeleteReply } from "@/features/quack/hooks/useReplyMutations"

type ReplyListProps = {
  replies: Reply[]
  viewerUserId?: string
  // admins may delete any reply; the server checks this again
  canModerate?: boolean
}

export function ReplyList({ replies, viewerUserId = "", canModerate = false }: ReplyListProps) {
  if (replies.length === 0) return null

  return (
    <ul
      aria-label="Replies"
      className="mt-2 flex flex-col gap-3 border-l border-border pl-4"
    >
      {replies.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          canDelete={reply.userId === viewerUserId || canModerate}
          isAuthor={reply.userId === viewerUserId}
        />
      ))}
    </ul>
  )
}

type ReplyItemProps = {
  reply: Reply
  canDelete: boolean
  isAuthor: boolean
}

function ReplyItem({ reply, canDelete, isAuthor }: ReplyItemProps) {
  const deleteReply = useDeleteReply()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleDelete = async () => {
    try {
      await deleteReply.mutateAsync(reply.id)
      setIsConfirmOpen(false)
      toast.success("Reply deleted")
    } catch (error) {
      toast.error("Could not delete the reply", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  return (
    <li className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <span>
          <UsersName name={reply.user.name} /> <UsersUserName username={reply.user.username} />
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <time className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</time>
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
              aria-label="Delete reply"
              onClick={() => setIsConfirmOpen(true)}
            >
              <Trash2 />
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this reply?</DialogTitle>
                <DialogDescription>
                  {isAuthor
                    ? "It disappears for everyone."
                    : `You are removing @${reply.user.username}'s reply as a moderator.`}{" "}
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
                  disabled={deleteReply.isPending}
                  onClick={() => void handleDelete()}
                >
                  {deleteReply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <p className="text-sm break-words whitespace-pre-line">{reply.text}</p>
    </li>
  )
}
