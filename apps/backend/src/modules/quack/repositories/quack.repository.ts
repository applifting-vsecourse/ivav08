import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Poll as PrismaPoll,
  PollOption as PrismaPollOption,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Quack } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

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

  async getQuacks(search?: string, viewerUserId?: string): Promise<Quack[]> {
    const normalizedSearch = search?.trim();
    const searchFilter = normalizedSearch
      ? { contains: normalizedSearch, mode: 'insensitive' as const }
      : undefined;
    const quacks = await this.prisma.quack.findMany({
      ...(searchFilter
        ? {
            where: {
              OR: [
                { text: searchFilter },
                { user: { is: { name: searchFilter } } },
                { user: { is: { username: searchFilter } } },
              ],
            },
          }
        : {}),
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
}
