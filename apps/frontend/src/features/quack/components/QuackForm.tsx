import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, X } from "lucide-react"
import { useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { QUACK_MOODS } from "@/lib/quack-moods"
import { cn } from "@/lib/utils"

import { useAddQuack } from "@/features/quack/hooks/useAddQuack"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280
const MAX_POLLS = 3
const MIN_OPTIONS = 2
const MAX_OPTIONS = 6
const MAX_OPTION_LENGTH = 80

const pollSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, "A poll question is required")
      .max(MAX_LENGTH, `Keep the question under ${MAX_LENGTH} characters`),
    options: z
      .array(
        z.object({
          text: z
            .string()
            .trim()
            .min(1, "An answer is required")
            .max(MAX_OPTION_LENGTH, `Keep answers under ${MAX_OPTION_LENGTH} characters`),
        }),
      )
      .min(MIN_OPTIONS, "Add at least 2 answers")
      .max(MAX_OPTIONS, "A poll can have no more than 6 answers"),
  })
  .superRefine((poll, context) => {
    const seen = new Set<string>()
    poll.options.forEach((option, index) => {
      const normalized = option.text.trim().toLowerCase()
      if (seen.has(normalized)) {
        context.addIssue({
          code: "custom",
          path: ["options", index, "text"],
          message: "Answers must be unique",
        })
      }
      seen.add(normalized)
    })
  })

const schema = z
  .object({
    text: z.string().trim().max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
    mood: z.enum(QUACK_MOODS).optional(),
    polls: z.array(pollSchema).max(MAX_POLLS, `A post can have no more than ${MAX_POLLS} polls`),
  })
  .superRefine((values, context) => {
    if (!values.text && values.polls.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["text"],
        message: "Write a post or add a poll",
      })
    }
  })

type FormValues = z.infer<typeof schema>

type QuackFormProps = { className?: string; defaultMood?: string }

export function QuackForm({ className, defaultMood }: QuackFormProps) {
  const addQuack = useAddQuack()
  const selectedDefaultMood = QUACK_MOODS.find((mood) => mood === defaultMood)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", mood: selectedDefaultMood, polls: [] },
  })
  const polls = useFieldArray({ control: form.control, name: "polls" })

  useEffect(() => {
    form.setValue("mood", selectedDefaultMood)
  }, [form, selectedDefaultMood])

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate(
      {
        text: values.text || undefined,
        mood: values.mood,
        polls:
          values.polls.length > 0
            ? values.polls.map((poll) => ({
                question: poll.question,
                options: poll.options.map((option) => option.text),
              }))
            : undefined,
      },
      {
        onSuccess: () => form.reset({ text: "", mood: selectedDefaultMood, polls: [] }),
      },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Post context or text</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Add context, or leave blank for a poll-only post..."
                    disabled={addQuack.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mood</FormLabel>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                  disabled={addQuack.isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose mood" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No mood</SelectItem>
                    <SelectItem value="happy">Happy</SelectItem>
                    <SelectItem value="sad">Sad</SelectItem>
                    <SelectItem value="angry">Angry</SelectItem>
                    <SelectItem value="silly">Silly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {polls.fields.map((poll, pollIndex) => (
          <PollComposer
            key={poll.id}
            form={form}
            pollIndex={pollIndex}
            isDisabled={addQuack.isPending}
            onRemove={() => polls.remove(pollIndex)}
          />
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm",
                length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {length}/{MAX_LENGTH}
            </span>
            {polls.fields.length < MAX_POLLS ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={addQuack.isPending}
                onClick={() =>
                  polls.append({ question: "", options: [{ text: "" }, { text: "" }] })
                }
              >
                <Plus className="size-4" />
                Add poll
              </Button>
            ) : null}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={addQuack.isPending}
          >
            {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Quack
          </Button>
        </div>
      </form>
    </Form>
  )
}

function PollComposer({
  form,
  pollIndex,
  isDisabled,
  onRemove,
}: {
  form: UseFormReturn<FormValues>
  pollIndex: number
  isDisabled: boolean
  onRemove: () => void
}) {
  const options = useFieldArray({
    control: form.control,
    name: `polls.${pollIndex}.options`,
  })
  const optionsError = form.formState.errors.polls?.[pollIndex]?.options?.message

  return (
    <fieldset className="space-y-3 border-t border-border pt-4">
      <legend className="text-sm font-medium">Poll {pollIndex + 1}</legend>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove poll ${pollIndex + 1}`}
          disabled={isDisabled}
          onClick={onRemove}
        >
          <X className="size-4" />
        </Button>
      </div>

      <FormField
        control={form.control}
        name={`polls.${pollIndex}.question`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Poll question</FormLabel>
            <FormControl>
              <Textarea
                rows={2}
                maxLength={MAX_LENGTH}
                disabled={isDisabled}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        {options.fields.map((option, optionIndex) => (
          <div
            key={option.id}
            className="flex items-start gap-2"
          >
            <FormField
              control={form.control}
              name={`polls.${pollIndex}.options.${optionIndex}.text`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">Answer {optionIndex + 1}</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={MAX_OPTION_LENGTH}
                      disabled={isDisabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove answer ${optionIndex + 1} from poll ${pollIndex + 1}`}
              disabled={isDisabled || options.fields.length <= MIN_OPTIONS}
              onClick={() => options.remove(optionIndex)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {optionsError ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {optionsError}
          </p>
        ) : null}
      </div>

      {options.fields.length < MAX_OPTIONS ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isDisabled}
          onClick={() => options.append({ text: "" })}
        >
          <Plus className="size-4" />
          Add answer
        </Button>
      ) : null}
    </fieldset>
  )
}
