import { useMutation, useQueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { addReply, deleteReply } from "@/features/quack/api/replies"

export function useAddReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addReply,
    onSuccess: async () => {
      // Replies come with the feed, so refresh every feed (All, Mine, search).
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}

export function useDeleteReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteReply,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
