import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, RotateCcw } from "lucide-react"
import { useForm } from "react-hook-form"
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

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(30, "Use no more than 30 characters")
    .regex(/^[a-zA-Z0-9._]+$/, "Use only letters, numbers, dots, and underscores"),
  name: z.string().trim().min(1, "Display name is required"),
  bio: z.string().max(160, "Bio must be 160 characters or fewer"),
  defaultMood: z.enum(["none", ...QUACK_MOODS]),
})

export type ProfileSettingsValues = z.infer<typeof schema>

type ProfileSettingsFormProps = {
  user: {
    name: string
    username: string
    bio: string
    defaultMood: string
  }
  isSaving: boolean
  onSave: (values: ProfileSettingsValues) => Promise<ProfileSettingsValues>
}

function valuesFromUser(user: ProfileSettingsFormProps["user"]): ProfileSettingsValues {
  const defaultMood = QUACK_MOODS.find((mood) => mood === user.defaultMood)

  return {
    username: user.username,
    name: user.name,
    bio: user.bio,
    defaultMood: defaultMood ?? "none",
  }
}

export function ProfileSettingsForm({ user, isSaving, onSave }: ProfileSettingsFormProps) {
  const form = useForm<ProfileSettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesFromUser(user),
  })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasSaved, setHasSaved] = useState(false)
  const initialValues = valuesFromUser(user)
  const { username, name, bio, defaultMood } = initialValues

  useEffect(() => {
    form.reset({ username, name, bio, defaultMood })
  }, [form, username, name, bio, defaultMood])

  const handleSubmit = async (values: ProfileSettingsValues) => {
    setSaveError(null)
    setHasSaved(false)
    form.clearErrors("username")

    try {
      const savedValues = await onSave(values)
      form.reset(savedValues)
      setHasSaved(true)
    } catch (error) {
      if ((error as { code?: string }).code === "USERNAME_IS_ALREADY_TAKEN") {
        form.setError("username", {
          type: "server",
          message: "That username is already taken",
        })
        return
      }

      setSaveError(error instanceof Error ? error.message : "Could not save settings")
    }
  }

  const handleDiscard = () => {
    form.reset(valuesFromUser(user))
    form.clearErrors()
    setSaveError(null)
    setHasSaved(false)
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8"
      >
        {saveError ? (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        {hasSaved ? (
          <p
            role="status"
            className="text-sm text-muted-foreground"
          >
            Settings saved.
          </p>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Profile</h2>

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    maxLength={160}
                    {...field}
                  />
                </FormControl>
                <div className="flex items-center justify-between gap-3">
                  <FormMessage />
                  <span className="text-sm text-muted-foreground">{field.value.length}/160</span>
                </div>
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">New post default</h2>
          <FormField
            control={form.control}
            name="defaultMood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default mood</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
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
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            disabled={isSaving}
          >
            <RotateCcw className="size-4" />
            Discard changes
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save settings
          </Button>
        </div>
      </form>
    </Form>
  )
}
