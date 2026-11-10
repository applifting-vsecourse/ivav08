import { useId, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { useAddReply } from "@/features/quack/hooks/useReplyMutations"

const MAX_REPLY_LENGTH = 280

type ReplyFormProps = {
  quackId: string
  onDone: () => void
}

export function ReplyForm({ quackId, onDone }: ReplyFormProps) {
  const fieldId = useId()
  const [text, setText] = useState("")
  const addReply = useAddReply()
  const trimmed = text.trim()
  const isTooLong = trimmed.length > MAX_REPLY_LENGTH
  const canSend = trimmed.length > 0 && !isTooLong && !addReply.isPending

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSend) return
    try {
      await addReply.mutateAsync({ quackId, text: trimmed })
      setText("")
      onDone()
    } catch (error) {
      // keep the text so nothing typed is lost
      toast.error("Could not send the reply", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  return (
    <form
      noValidate
      className="mt-2 flex flex-col gap-2"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <Label
        htmlFor={fieldId}
        className="sr-only"
      >
        Your reply
      </Label>
      <Textarea
        id={fieldId}
        value={text}
        placeholder="Write a reply…"
        aria-invalid={isTooLong}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex items-center justify-end gap-2">
        <span className={isTooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {trimmed.length}/{MAX_REPLY_LENGTH}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!canSend}
        >
          {addReply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Reply
        </Button>
      </div>
    </form>
  )
}
