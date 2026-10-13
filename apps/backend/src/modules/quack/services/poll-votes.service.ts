import {
  PollVoteWriteResult,
  QuackRepository,
} from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class PollVotesService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async vote(user: Identity, pollId: string, optionId: string): Promise<void> {
    const result = await this.runVoteWrite(() =>
      this.quackRepository.castPollVote(pollId, optionId, user.id),
    );
    this.assertVoteWriteSucceeded(result);
  }

  async cancelVote(user: Identity, pollId: string): Promise<void> {
    const result = await this.runVoteWrite(() =>
      this.quackRepository.cancelPollVote(pollId, user.id),
    );
    this.assertVoteWriteSucceeded(result);
  }

  private async runVoteWrite(
    write: () => Promise<PollVoteWriteResult>,
  ): Promise<PollVoteWriteResult> {
    try {
      return await write();
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'The poll changed while saving your vote. Try again.',
        );
      }
      throw error;
    }
  }

  private assertVoteWriteSucceeded(result: PollVoteWriteResult): void {
    if (result === 'poll-not-found')
      throw new NotFoundException('Poll not found');
    if (result === 'poll-closed')
      throw new ConflictException('This poll is closed');
    if (result === 'option-not-in-poll') {
      throw new BadRequestException('That option does not belong to this poll');
    }
  }
}
