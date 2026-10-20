import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"

type SignInInput = {
  email: string
  password: string
  rememberMe?: boolean
}

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password, rememberMe = false }: SignInInput) => {
      const { error } = await authClient.signIn.email({ email, password, rememberMe })
      if (error) throw new Error(error.message ?? "Sign in failed")
    },
    onSuccess: async () => {
      // refetchType "all": the session query may have no active observer right after
      // sign-in, and without this it would only be marked stale, not refetched
      await queryClient.invalidateQueries({ queryKey: authKeys.session(), refetchType: "all" })
    },
  })
}
