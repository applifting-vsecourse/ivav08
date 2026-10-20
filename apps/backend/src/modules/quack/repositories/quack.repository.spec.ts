import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { QuackRepository } from './quack.repository';

describe('QuackRepository', () => {
  it('searches post text and author fields case-insensitively', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findMany.mockResolvedValue([]);
    const repository = new QuackRepository(prisma);

    await repository.getQuacks('  Pond  ', 'viewer');

    expect(prisma.quack.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { text: { contains: 'Pond', mode: 'insensitive' } },
          { user: { is: { name: { contains: 'Pond', mode: 'insensitive' } } } },
          {
            user: {
              is: { username: { contains: 'Pond', mode: 'insensitive' } },
            },
          },
        ],
      },
      include: {
        user: true,
        polls: {
          include: {
            options: {
              orderBy: { position: 'asc' },
              include: {
                _count: { select: { votes: true } },
                votes: {
                  where: { userId: 'viewer' },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns the complete feed for an empty search', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findMany.mockResolvedValue([]);
    const repository = new QuackRepository(prisma);

    await repository.getQuacks('   ', 'viewer');

    expect(prisma.quack.findMany).toHaveBeenCalledWith({
      include: {
        user: true,
        polls: {
          include: {
            options: {
              orderBy: { position: 'asc' },
              include: {
                _count: { select: { votes: true } },
                votes: {
                  where: { userId: 'viewer' },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('hides counts from a reader who has not voted', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findMany.mockResolvedValue([
      {
        id: 'q1',
        text: 'Lunch?',
        mood: null,
        userId: 'author',
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
        user: { id: 'author', name: 'Author', username: 'author' },
        polls: [
          {
            id: 'p1',
            quackId: 'q1',
            question: 'Where?',
            status: 'open',
            createdAt: new Date('2026-01-01T12:00:00Z'),
            updatedAt: new Date('2026-01-01T12:00:00Z'),
            options: [
              {
                id: 'o1',
                pollId: 'p1',
                label: 'Cafe',
                position: 0,
                _count: { votes: 3 },
                votes: [],
              },
            ],
          },
        ],
      },
    ] as never);
    const repository = new QuackRepository(prisma);

    const [quack] = await repository.getQuacks(undefined, 'reader');

    expect(quack.polls[0]).toMatchObject({
      resultsVisible: false,
      myVoteOptionId: null,
    });
    expect(quack.polls[0].options[0].voteCount).toBeNull();
  });

  it('shows counts to the author and records the viewer vote', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findMany.mockResolvedValue([
      {
        id: 'q1',
        text: 'Lunch?',
        mood: null,
        userId: 'author',
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
        user: { id: 'author', name: 'Author', username: 'author' },
        polls: [
          {
            id: 'p1',
            quackId: 'q1',
            question: 'Where?',
            status: 'open',
            createdAt: new Date('2026-01-01T12:00:00Z'),
            updatedAt: new Date('2026-01-01T12:00:00Z'),
            options: [
              {
                id: 'o1',
                pollId: 'p1',
                label: 'Cafe',
                position: 0,
                _count: { votes: 3 },
                votes: [{ userId: 'voter' }],
              },
            ],
          },
        ],
      },
    ] as never);
    const repository = new QuackRepository(prisma);

    const [authorView] = await repository.getQuacks(undefined, 'author');
    const [voterView] = await repository.getQuacks(undefined, 'voter');

    expect(authorView.polls[0].resultsVisible).toBe(true);
    expect(authorView.polls[0].options[0].voteCount).toBe(3);
    expect(voterView.polls[0]).toMatchObject({
      resultsVisible: true,
      myVoteOptionId: 'o1',
    });
    expect(voterView.polls[0].options[0].voteCount).toBe(3);
  });

  it('narrows the feed to one author for the Mine tab, combined with search', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findMany.mockResolvedValue([]);
    const repository = new QuackRepository(prisma);

    await repository.getQuacks('pond', 'viewer', 'viewer');

    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'viewer',
          OR: [
            { text: { contains: 'pond', mode: 'insensitive' } },
            {
              user: { is: { name: { contains: 'pond', mode: 'insensitive' } } },
            },
            {
              user: {
                is: { username: { contains: 'pond', mode: 'insensitive' } },
              },
            },
          ],
        },
      }),
    );
  });
});
