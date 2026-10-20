import { Quack, QuackStats } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    search: string | undefined,
    viewerUserId: string,
    onlyMine = false,
  ): Promise<Quack[]> {
    return this.quackRepository.getQuacks(
      search?.trim() || undefined,
      viewerUserId,
      // "Mine" is always the signed-in user — never a user id from the request
      onlyMine ? viewerUserId : undefined,
    );
  }

  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    const authorId = await this.quackRepository.findQuackAuthorId(quackId);
    if (!authorId) {
      throw new NotFoundException('Quack not found');
    }

    // The owner-or-admin check lives here, on the server. Hiding the button in
    // the UI is only a convenience — a direct API call must be refused too.
    // The role comes from the session; users cannot set it themselves.
    const isOwner = authorId === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You can only delete your own quacks');
    }

    await this.quackRepository.deleteQuack(quackId);
  }

  async getStats(): Promise<QuackStats> {
    return this.quackRepository.getStats();
  }

  async createQuack(
    user: Identity,
    quackData: {
      text?: string;
      mood?: string;
      polls?: Array<{ question: string; options: string[] }>;
    },
  ): Promise<Quack> {
    const text = quackData.text?.trim() ?? '';
    const polls = quackData.polls ?? [];

    if (!text && polls.length === 0) {
      throw new BadRequestException('A post needs text or at least one poll');
    }

    for (const poll of polls) {
      const normalizedOptions = poll.options.map((option) =>
        option.trim().toLowerCase(),
      );
      if (new Set(normalizedOptions).size !== normalizedOptions.length) {
        throw new BadRequestException('Poll options must be unique');
      }
    }

    return this.quackRepository.createQuack({
      text,
      mood: quackData.mood,
      polls,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }
}
