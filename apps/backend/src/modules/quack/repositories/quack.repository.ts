import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  Poll as PrismaPoll,
  PollOption as PrismaPollOption,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Quack } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

export type PollVoteWriteResult =
  'ok' | 'poll-not-found' | 'poll-closed' | 'option-not-in-poll';

export type PollEditResult =
  | 'ok'
  | 'poll-not-found'
  | 'forbidden'
  | 'invalid-options'
  | 'option-has-votes';

export type PollStatusWriteResult =
  'ok' | 'poll-not-found' | 'quack-not-found' | 'forbidden';

type PrismaPollWithOptions = PrismaPoll & {
  options: Array<
    PrismaPollOption & {
      _count: { votes: number };
      votes: Array<{ userId: string }>;
    }
  >;
};

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & { user?: PrismaUser; polls?: PrismaPollWithOptions[] },
  viewerUserId?: string,
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  polls: (quack.polls ?? []).map((poll) => {
    const myVoteOptionId =
      poll.options.find((option) =>
        option.votes.some((vote) => vote.userId === viewerUserId),
      )?.id ?? null;
    const resultsVisible =
      quack.userId === viewerUserId ||
      myVoteOptionId !== null ||
      poll.status === 'closed';

    return {
      id: poll.id,
      question: poll.question,
      status: poll.status,
      resultsVisible,
      myVoteOptionId,
      options: poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        position: option.position,
        voteCount: resultsVisible ? option._count.votes : null,
      })),
    };
  }),
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username ?? '',
      }
    : undefined,
});

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getQuacks(
    search?: string,
    viewerUserId?: string,
    authorUserId?: string,
  ): Promise<Quack[]> {
    const normalizedSearch = search?.trim();
    const searchFilter = normalizedSearch
      ? { contains: normalizedSearch, mode: 'insensitive' as const }
      : undefined;
    const where: Prisma.QuackWhereInput = {
      ...(authorUserId ? { userId: authorUserId } : {}),
      ...(searchFilter
        ? {
            OR: [
              { text: searchFilter },
              { user: { is: { name: searchFilter } } },
              { user: { is: { username: searchFilter } } },
            ],
          }
        : {}),
    };
    const hasFilter = Object.keys(where).length > 0;
    const quacks = await this.prisma.quack.findMany({
      ...(hasFilter ? { where } : {}),
      include: {
        user: true,
        polls: {
          include: {
            options: {
              orderBy: { position: 'asc' },
              include: {
                _count: { select: { votes: true } },
                votes: {
                  where: viewerUserId ? { userId: viewerUserId } : undefined,
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map((quack) => mapPrismaQuackToDomain(quack, viewerUserId));
  }

  async createQuack(createQuackData: {
    text: string;
    mood?: string;
    userId: string;
    polls: Array<{ question: string; options: string[] }>;
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood ?? null,
        user: { connect: { id: createQuackData.userId } },
        polls: {
          create: createQuackData.polls.map((poll) => ({
            question: poll.question.trim(),
            options: {
              create: poll.options.map((label, position) => ({
                label: label.trim(),
                position,
              })),
            },
          })),
        },
      },
      include: {
        user: true,
        polls: {
          include: {
            options: {
              orderBy: { position: 'asc' },
              include: {
                _count: { select: { votes: true } },
                votes: { select: { userId: true } },
              },
            },
          },
        },
      },
    });
    return mapPrismaQuackToDomain(quack, createQuackData.userId);
  }

  async findQuackAuthorId(quackId: string): Promise<string | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { userId: true },
    });
    return quack?.userId ?? null;
  }

  async deleteQuack(quackId: string): Promise<void> {
    // Polls and their options cascade with the quack, but a vote's option is
    // ON DELETE RESTRICT — so remove the votes first, all in one transaction.
    await this.prisma.$transaction([
      this.prisma.pollVote.deleteMany({ where: { poll: { quackId } } }),
      this.prisma.quack.delete({ where: { id: quackId } }),
    ]);
  }

  async castPollVote(
    pollId: string,
    optionId: string,
    userId: string,
  ): Promise<PollVoteWriteResult> {
    return this.prisma.$transaction(
      async (transaction) => {
        const poll = await transaction.poll.findUnique({
          where: { id: pollId },
          select: {
            status: true,
            options: { where: { id: optionId }, select: { id: true } },
          },
        });

        if (!poll) return 'poll-not-found';
        if (poll.status === 'closed') return 'poll-closed';
        if (poll.options.length === 0) return 'option-not-in-poll';

        await transaction.pollVote.upsert({
          where: { pollId_userId: { pollId, userId } },
          create: { pollId, optionId, userId },
          update: { optionId },
        });

        return 'ok';
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancelPollVote(
    pollId: string,
    userId: string,
  ): Promise<PollVoteWriteResult> {
    return this.prisma.$transaction(
      async (transaction) => {
        const poll = await transaction.poll.findUnique({
          where: { id: pollId },
          select: { status: true },
        });

        if (!poll) return 'poll-not-found';
        if (poll.status === 'closed') return 'poll-closed';

        await transaction.pollVote.deleteMany({ where: { pollId, userId } });
        return 'ok';
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async updatePoll(
    pollId: string,
    userId: string,
    question: string,
    options: Array<{ id?: string; label: string }>,
  ): Promise<PollEditResult> {
    return this.prisma.$transaction(
      async (transaction) => {
        const poll = await transaction.poll.findUnique({
          where: { id: pollId },
          include: {
            quack: { select: { userId: true } },
            options: { include: { _count: { select: { votes: true } } } },
          },
        });

        if (!poll) return 'poll-not-found';
        if (poll.quack.userId !== userId) return 'forbidden';

        const optionIds = options.flatMap((option) =>
          option.id ? [option.id] : [],
        );
        if (
          options.length < 2 ||
          options.length > 6 ||
          new Set(optionIds).size !== optionIds.length ||
          options.some((option) =>
            option.id
              ? !poll.options.some((existing) => existing.id === option.id)
              : false,
          )
        ) {
          return 'invalid-options';
        }

        const normalizedLabels = options.map((option) =>
          option.label.trim().toLowerCase(),
        );
        if (new Set(normalizedLabels).size !== normalizedLabels.length) {
          return 'invalid-options';
        }

        const removedOptions = poll.options.filter(
          (option) => !optionIds.includes(option.id),
        );
        if (removedOptions.some((option) => option._count.votes > 0)) {
          return 'option-has-votes';
        }

        await transaction.poll.update({
          where: { id: pollId },
          data: { question: question.trim() },
        });

        if (removedOptions.length > 0) {
          await transaction.pollOption.deleteMany({
            where: { id: { in: removedOptions.map((option) => option.id) } },
          });
        }

        await transaction.pollOption.updateMany({
          where: { pollId },
          data: { position: { increment: 100 } },
        });

        for (const [position, option] of options.entries()) {
          if (option.id) {
            await transaction.pollOption.update({
              where: { id: option.id },
              data: { label: option.label.trim(), position },
            });
          } else {
            await transaction.pollOption.create({
              data: { pollId, label: option.label.trim(), position },
            });
          }
        }

        return 'ok';
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async setPollStatus(
    pollId: string,
    userId: string,
    status: 'open' | 'closed',
  ): Promise<PollStatusWriteResult> {
    return this.prisma.$transaction(
      async (transaction) => {
        const poll = await transaction.poll.findUnique({
          where: { id: pollId },
          include: { quack: { select: { userId: true } } },
        });

        if (!poll) return 'poll-not-found';
        if (poll.quack.userId !== userId) return 'forbidden';

        await transaction.poll.update({
          where: { id: pollId },
          data: { status },
        });
        return 'ok';
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async setQuackPollStatus(
    quackId: string,
    userId: string,
    status: 'open' | 'closed',
  ): Promise<PollStatusWriteResult> {
    return this.prisma.$transaction(
      async (transaction) => {
        const quack = await transaction.quack.findUnique({
          where: { id: quackId },
          select: { userId: true },
        });

        if (!quack) return 'quack-not-found';
        if (quack.userId !== userId) return 'forbidden';

        await transaction.poll.updateMany({
          where: { quackId },
          data: { status },
        });
        return 'ok';
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
