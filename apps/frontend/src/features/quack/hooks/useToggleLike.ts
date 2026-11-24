import { useMutation, useQueryClient } from "@tanstack/react-query"

import { likeQuack, unlikeQuack } from "@/features/quack/api/likes"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"

export function useToggleLike(quackId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (shouldLike: boolean) => (shouldLike ? likeQuack(quackId) : unlikeQuack(quackId)),
    onSuccess: async (likes) => {
      // Show the server's answer right away in every cached feed, then
      // refetch so other people's likes come in too.
      queryClient.setQueriesData<Quack[]>({ queryKey: [...quackKeys.all(), "list"] }, (quacks) =>
        quacks?.map((quack) => (quack.id === quackId ? { ...quack, ...likes } : quack)),
      )
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
