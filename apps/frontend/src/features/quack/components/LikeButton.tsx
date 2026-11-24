import { Heart } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useToggleLike } from "@/features/quack/hooks/useToggleLike"

type LikeButtonProps = {
  quackId: string
  likeCount: number
  likedByMe: boolean
}

// A toggle: pressed = I like it. The count is always visible.
export function LikeButton({ quackId, likeCount, likedByMe: isLiked }: LikeButtonProps) {
  const toggleLike = useToggleLike(quackId)

  const handleClick = async () => {
    try {
      await toggleLike.mutateAsync(!isLiked)
    } catch (error) {
      toast.error("Could not update the like", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-fit text-muted-foreground"
      aria-label={`Like (${likeCount})`}
      aria-pressed={isLiked}
      disabled={toggleLike.isPending}
      onClick={() => void handleClick()}
    >
      <Heart className={cn(isLiked && "fill-current text-foreground")} />
      {likeCount}
    </Button>
  )
}
