import { Quack, QuackReply } from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class QuackUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;
}

class PollOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty({ nullable: true })
  voteCount!: number | null;
}

class PollResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  question!: string;

  @ApiProperty({ enum: ['open', 'closed'] })
  status!: 'open' | 'closed';

  @ApiProperty()
  resultsVisible!: boolean;

  @ApiProperty({ nullable: true })
  myVoteOptionId!: string | null;

  @ApiProperty({ type: [PollOptionResponseDto] })
  options!: PollOptionResponseDto[];
}

export class ReplyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  quackId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  static fromDomain(reply: QuackReply): ReplyResponseDto {
    return {
      id: reply.id,
      text: reply.text,
      quackId: reply.quackId,
      userId: reply.userId,
      createdAt: reply.createdAt,
      user: {
        id: reply.user.id,
        name: reply.user.name,
        username: reply.user.username,
      },
    };
  }
}

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiPropertyOptional({
    enum: ['happy', 'sad', 'angry', 'silly'],
    nullable: true,
  })
  mood!: string | null;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  @ApiProperty({ type: [PollResponseDto] })
  polls!: PollResponseDto[];

  @ApiProperty({
    description:
      'Deleted quack kept as a placeholder for its replies: text is empty, mood null, polls empty (ADR 0001)',
  })
  deleted!: boolean;

  @ApiProperty({ type: () => [ReplyResponseDto] })
  replies!: ReplyResponseDto[];

  static fromDomain(quack: Quack): QuackResponseDto {
    if (!quack.user) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.user to be loaded for quack ${quack.id}`,
      );
    }
    return {
      id: quack.id,
      text: quack.text,
      mood: quack.mood,
      polls: quack.polls.map((poll) => ({
        id: poll.id,
        question: poll.question,
        status: poll.status,
        resultsVisible: poll.resultsVisible,
        myVoteOptionId: poll.myVoteOptionId,
        options: poll.options,
      })),
      userId: quack.userId,
      createdAt: quack.createdAt,
      deleted: quack.deleted,
      replies: quack.replies.map((reply) => ReplyResponseDto.fromDomain(reply)),
      user: {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username,
      },
    };
  }
}
