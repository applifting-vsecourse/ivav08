import { useState } from "react"
import { Loader2, Pencil, Plus, RotateCcw, Save, X } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { usePollManagement, usePollVote } from "@/features/quack/hooks/usePollMutations"

const editSchema = z.object({
  question: z.string().trim().min(1).max(280),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim().min(1).max(80),
      }),
    )
    .min(2)
    .max(6)
    .superRefine((options, context) => {
      const labels = options.map((option) => option.label.trim().toLowerCase())
      if (new Set(labels).size !== labels.length) {
        context.addIssue({ code: "custom", message: "Answers must be unique" })
      }
    }),
})

type PollCardProps = {
  poll: Poll
  isAuthor: boolean
  viewerUserId: string
}

type PollOptionDraft = { id?: string; label: string }

export function PollCard({ poll, isAuthor, viewerUserId }: PollCardProps) {
  const vote = usePollVote()
  const management = usePollManagement()
  const [isEditing, setIsEditing] = useState(false)
  const [question, setQuestion] = useState(poll.question)
  const [options, setOptions] = useState<PollOptionDraft[]>(
    poll.options.map(({ id, label }) => ({ id, label })),
  )
  const [editError, setEditError] = useState<string | null>(null)
  const isVotePending = vote.isPending && vote.variables?.pollId === poll.id
  const isEditPending = management.edit.isPending
  const isStatusPending =
    management.updatePollStatus.isPending || management.updateQuackPollsStatus.isPending

  const handleVote = (optionId: string) => {
    if (optionId === poll.myVoteOptionId) return
    vote.mutate({ pollId: poll.id, optionId, viewerUserId })
  }

  const handleCancelVote = () => {
    vote.mutate({ pollId: poll.id, optionId: null, viewerUserId })
  }

  const handleSave = async () => {
    const parsed = editSchema.safeParse({ question, options })
    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? "Check the question and answers")
      return
    }

    setEditError(null)
    try {
      await management.edit.mutateAsync({ pollId: poll.id, ...parsed.data })
      setIsEditing(false)
    } catch {
      setEditError("Could not save the poll. Your changes are still here; try again.")
    }
  }

  const handleToggleStatus = async () => {
    try {
      await management.updatePollStatus.mutateAsync({
        pollId: poll.id,
        status: poll.status === "open" ? "closed" : "open",
      })
    } catch {
      toast.error("Could not update poll status", {
        description: "The poll status was not changed. Please try again.",
      })
    }
  }

  const totalVotes = poll.options.reduce((total, option) => total + (option.voteCount ?? 0), 0)

  return (
    <section
      aria-labelledby={`${poll.id}-question`}
      className="mt-4 space-y-3 border-t border-border pt-4"
    >
      {isEditing ? (
        <div className="space-y-3">
          <label
            htmlFor={`${poll.id}-edit-question`}
            className="text-sm font-medium"
          >
            Poll question
          </label>
          <Textarea
            id={`${poll.id}-edit-question`}
            value={question}
            maxLength={280}
            rows={2}
            disabled={isEditPending}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <div className="space-y-2">
            {options.map((option, index) => {
              const existingOption = poll.options.find((item) => item.id === option.id)
              const hasVotes = (existingOption?.voteCount ?? 0) > 0

              return (
                <div
                  key={option.id ?? `new-${index}`}
                  className="flex items-center gap-2"
                >
                  <label
                    className="sr-only"
                    htmlFor={`${poll.id}-option-${index}`}
                  >
                    Answer {index + 1}
                  </label>
                  <Input
                    id={`${poll.id}-option-${index}`}
                    value={option.label}
                    maxLength={80}
                    disabled={isEditPending}
                    onChange={(event) =>
                      setOptions((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove answer ${index + 1}`}
                    title={hasVotes ? "Answers with votes cannot be removed" : "Remove answer"}
                    disabled={hasVotes || options.length <= 2}
                    onClick={() => setOptions((current) => current.filter((_, i) => i !== index))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )
            })}
          </div>
          {options.length < 6 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOptions((current) => [...current, { label: "" }])}
            >
              <Plus className="size-4" />
              Add answer
            </Button>
          ) : null}
          {editError ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {editError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isEditPending}
              onClick={() => {
                setQuestion(poll.question)
                setOptions(poll.options.map(({ id, label }) => ({ id, label })))
                setEditError(null)
                setIsEditing(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isEditPending}
              onClick={() => void handleSave()}
            >
              {isEditPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save poll
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                id={`${poll.id}-question`}
                className="font-medium"
              >
                {poll.question}
              </h3>
              <p className="text-sm text-muted-foreground">
                {poll.status === "closed" ? "Closed" : "Open"}
                {poll.resultsVisible ? ` · ${totalVotes} votes` : " · Vote to see results"}
              </p>
            </div>
            {isAuthor ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isStatusPending}
                  onClick={() => void handleToggleStatus()}
                >
                  {poll.status === "open" ? "Close poll" : "Reopen poll"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Edit poll"
                  title="Edit poll"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>

          <RadioGroup
            aria-label={`Answers for ${poll.question}`}
            value={poll.myVoteOptionId ?? ""}
            onValueChange={handleVote}
            disabled={poll.status === "closed" || isVotePending}
          >
            {poll.options.map((option) => (
              <div
                key={option.id}
                className="flex items-center gap-3"
              >
                <RadioGroupItem
                  id={`${poll.id}-${option.id}`}
                  value={option.id}
                  aria-label={option.label}
                />
                <label
                  htmlFor={`${poll.id}-${option.id}`}
                  className="flex flex-1 cursor-pointer items-center justify-between gap-3 text-sm"
                >
                  <span className="break-words">{option.label}</span>
                  {poll.resultsVisible ? <span>{option.voteCount ?? 0}</span> : null}
                </label>
              </div>
            ))}
          </RadioGroup>

          {isVotePending ? (
            <span
              className="flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" />
              Saving vote
            </span>
          ) : null}
          {poll.myVoteOptionId && poll.status === "open" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isVotePending}
              onClick={handleCancelVote}
            >
              <RotateCcw className="size-4" />
              Remove my vote
            </Button>
          ) : null}
        </>
      )}
    </section>
  )
}
