import { QuackLikes } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

export class QuackLikesResponseDto {
  @ApiProperty({ description: 'How many users like the quack' })
  likeCount!: number;

  @ApiProperty({ description: 'Whether the signed-in user likes it' })
  likedByMe!: boolean;

  static fromDomain(likes: QuackLikes): QuackLikesResponseDto {
    return { likeCount: likes.likeCount, likedByMe: likes.likedByMe };
  }
}
