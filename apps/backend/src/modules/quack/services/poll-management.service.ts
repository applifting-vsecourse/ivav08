import {
  PollEditResult,
  PollStatusWriteResult,
  QuackRepository,
} from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class PollManagementService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async updatePoll(
    user: Identity,
    pollId: string,
    question: string,
    options: Array<{ id?: string; label: string }>,
  ): Promise<void> {
    const result = await this.runWrite(() =>
      this.quackRepository.updatePoll(pollId, user.id, question, options),
    );

    if (result === 'poll-not-found')
      throw new NotFoundException('Poll not found');
    if (result === 'forbidden') {
      throw new ForbiddenException('Only the post author can edit this poll');
    }
    if (result === 'option-has-votes') {
      throw new ConflictException('An answer with votes cannot be removed');
    }
    if (result === 'invalid-options') {
      throw new BadRequestException(
        'Poll answers must be unique and contain 2–6 options',
      );
    }
  }

  async setPollStatus(
    user: Identity,
    pollId: string,
    status: 'open' | 'closed',
  ): Promise<void> {
    const result = await this.runWrite(() =>
      this.quackRepository.setPollStatus(pollId, user.id, status),
    );
    this.assertStatusChanged(result);
  }

  async setQuackPollStatus(
    user: Identity,
    quackId: string,
    status: 'open' | 'closed',
  ): Promise<void> {
    const result = await this.runWrite(() =>
      this.quackRepository.setQuackPollStatus(quackId, user.id, status),
    );
    this.assertStatusChanged(result);
  }

  private async runWrite<T extends PollEditResult | PollStatusWriteResult>(
    write: () => Promise<T>,
  ): Promise<T> {
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
          'The poll changed while saving. Refresh and try again.',
        );
      }
      throw error;
    }
  }

  private assertStatusChanged(result: PollStatusWriteResult): void {
    if (result === 'poll-not-found')
      throw new NotFoundException('Poll not found');
    if (result === 'quack-not-found')
      throw new NotFoundException('Post not found');
    if (result === 'forbidden') {
      throw new ForbiddenException(
        'Only the post author can change poll status',
      );
    }
  }
}
