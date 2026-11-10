import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { QuackRepository } from './quack.repository';

describe('QuackRepository', () => {
  it('searches post text and author fields case-insensitively', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findMany.mockResolvedValue([]);
    const repository = new QuackRepository(prisma);

    await repository.getQuacks('  Pond  ', 'viewer');

    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { deletedAt: null },
            {
              OR: [
                { text: { contains: 'Pond', mode: 'insensitive' } },
                {
                  user: {
                    is: { name: { contains: 'Pond', mode: 'insensitive' } },
                  },
                },
                {
                  user: {
                    is: { username: { contains: 'Pond', mode: 'insensitive' } },
                  },
                },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('returns the complete feed for an empty search', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findMany.mockResolvedValue([]);
    const repository = new QuackRepository(prisma);

    await repository.getQuacks('   ', 'viewer');

    // ADR 0001: deleted quacks stay only as placeholders for their replies
    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ OR: [{ deletedAt: null }, { replies: { some: {} } }] }],
        },
        include: expect.objectContaining({
          user: true,
          replies: { include: { user: true }, orderBy: { createdAt: 'asc' } },
        }),
        orderBy: { createdAt: 'desc' },
      }),
    );
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
          AND: [
            { deletedAt: null },
            { userId: 'viewer' },
            {
              OR: [
                { text: { contains: 'pond', mode: 'insensitive' } },
                {
                  user: {
                    is: { name: { contains: 'pond', mode: 'insensitive' } },
                  },
                },
                {
                  user: {
                    is: { username: { contains: 'pond', mode: 'insensitive' } },
                  },
                },
              ],
            },
          ],
        },
      }),
    );
  });

  it('turns a deleted quack into a tombstone instead of removing the row', async () => {
    const prisma = mockDeep<PrismaService>();
    const repository = new QuackRepository(prisma);

    await repository.deleteQuack('q1');

    // votes first: a vote's option is ON DELETE RESTRICT
    expect(prisma.pollVote.deleteMany).toHaveBeenCalledWith({
      where: { poll: { quackId: 'q1' } },
    });
    expect(prisma.poll.deleteMany).toHaveBeenCalledWith({
      where: { quackId: 'q1' },
    });
    expect(prisma.quack.update).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: { text: '', mood: null, deletedAt: expect.any(Date) },
    });
    expect(prisma.quack.delete).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('never sends the content of a deleted quack, but keeps its replies', async () => {
    const prisma = mockDeep<PrismaService>();
    const user = {
      id: 'u1',
      name: 'Caffeinated Duck',
      username: 'CaffeinatedDuck',
    };
    prisma.quack.findMany.mockResolvedValue([
      {
        id: 'q1',
        text: 'should never leave the database',
        mood: 'happy',
        userId: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
        user,
        polls: [],
        replies: [
          {
            id: 'r1',
            text: 'a reply',
            quackId: 'q1',
            userId: 'u2',
            createdAt: new Date(),
            user: { ...user, id: 'u2', username: 'DeepDuckThoughts' },
          },
        ],
      },
    ] as never);
    const repository = new QuackRepository(prisma);

    const [quack] = await repository.getQuacks(undefined, 'viewer');

    expect(quack).toMatchObject({ deleted: true, text: '', mood: null });
    expect(quack.replies).toHaveLength(1);
    expect(quack.replies[0]).toMatchObject({ id: 'r1', text: 'a reply' });
  });

  it('treats a deleted quack as not found when looking up its author', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findUnique.mockResolvedValue({
      userId: 'u1',
      deletedAt: new Date(),
    } as never);
    const repository = new QuackRepository(prisma);

    await expect(repository.findActiveQuackAuthorId('q1')).resolves.toBeNull();
  });
});
