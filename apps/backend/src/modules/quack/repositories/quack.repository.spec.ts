import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { QuackRepository } from './quack.repository';

describe('QuackRepository', () => {
  it('searches post text and author fields case-insensitively', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findMany.mockResolvedValue([]);
    const repository = new QuackRepository(prisma);

    await repository.getQuacks('  Pond  ');

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
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns the complete feed for an empty search', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.quack.findMany.mockResolvedValue([]);
    const repository = new QuackRepository(prisma);

    await repository.getQuacks('   ');

    expect(prisma.quack.findMany).toHaveBeenCalledWith({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  });
});
