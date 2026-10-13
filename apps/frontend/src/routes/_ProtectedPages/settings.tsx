import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { authKeys } from "@/lib/auth-keys"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { useSession } from "@/features/auth/hooks/useSession"
import { authClient } from "@/features/auth/lib/auth-client"
import { quackKeys } from "@/features/quack/api/quackKeys"
import {
  ProfileSettingsForm,
  type ProfileSettingsValues,
} from "@/features/settings/components/ProfileSettingsForm"

export const Route = createFileRoute("/_ProtectedPages/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const updateProfile = useMutation({
    mutationFn: async (values: ProfileSettingsValues) => {
      const updateUser = authClient.updateUser as unknown as (input: {
        name: string
        username: string
        bio: string
        defaultMood: string
      }) => Promise<{
        error: { message?: string; code?: string } | null
      }>
      const { error } = await updateUser({
        name: values.name.trim(),
        username: values.username.trim(),
        bio: values.bio.trim(),
        defaultMood: values.defaultMood === "none" ? "" : values.defaultMood,
      })

      if (error) {
        throw Object.assign(new Error(error.message ?? "Could not save settings"), {
          code: error.code,
        })
      }

      return values
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.session() }),
        queryClient.invalidateQueries({ queryKey: quackKeys.all() }),
      ])
    },
  })

  const handleSave = async (values: ProfileSettingsValues) => {
    await updateProfile.mutateAsync(values)
    const session = await queryClient.fetchQuery({
      ...authSessionQueryOptions(),
      staleTime: 0,
    })

    if (!session) throw new Error("Your session could not be refreshed")

    const defaultMood = ["happy", "sad", "angry", "silly"].find(
      (mood) => mood === session.user.defaultMood,
    )

    return {
      username: session.user.username,
      name: session.user.name,
      bio: session.user.bio,
      defaultMood: (defaultMood ?? "none") as ProfileSettingsValues["defaultMood"],
    }
  }

  return (
    <>
      <Seo title="Settings" />
      <section className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        {user ? (
          <ProfileSettingsForm
            user={user}
            isSaving={updateProfile.isPending}
            onSave={handleSave}
          />
        ) : null}
      </section>
    </>
  )
}
