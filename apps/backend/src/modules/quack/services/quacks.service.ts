import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    search: string | undefined,
    viewerUserId: string,
  ): Promise<Quack[]> {
    return this.quackRepository.getQuacks(
      search?.trim() || undefined,
      viewerUserId,
    );
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
