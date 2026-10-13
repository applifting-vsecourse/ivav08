import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { QuackRepository } from './quack.repository';

describe('QuackRepository poll votes', () => {
  it('uses the database unique key to create or switch one vote per user', async () => {
    const prisma = mockDeep<PrismaService>();
    const transaction = mockDeep<Prisma.TransactionClient>();
    transaction.poll.findUnique.mockResolvedValue({
      status: 'open',
      options: [{ id: 'option-2' }],
    } as never);
    const repository = new QuackRepository(prisma);

    await repository.castPollVote('poll-1', 'option-2', 'user-1');

    const [operation] = prisma.$transaction.mock.calls[0];
    if (typeof operation !== 'function')
      throw new Error('Expected an interactive transaction');
    await operation(transaction);

    expect(transaction.pollVote.upsert).toHaveBeenCalledWith({
      where: { pollId_userId: { pollId: 'poll-1', userId: 'user-1' } },
      create: { pollId: 'poll-1', optionId: 'option-2', userId: 'user-1' },
      update: { optionId: 'option-2' },
    });
  });

  it('does not write a vote when the poll is closed or the option is unrelated', async () => {
    const prisma = mockDeep<PrismaService>();
    const transaction = mockDeep<Prisma.TransactionClient>();
    transaction.poll.findUnique
      .mockResolvedValueOnce({
        status: 'closed',
        options: [{ id: 'option-1' }],
      } as never)
      .mockResolvedValueOnce({ status: 'open', options: [] } as never);
    const repository = new QuackRepository(prisma);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await repository.castPollVote('poll-1', 'option-2', 'user-1');
      const [operation] = prisma.$transaction.mock.calls[attempt];
      if (typeof operation !== 'function') {
        throw new Error('Expected an interactive transaction');
      }
      const result = await operation(transaction);
      expect(result).toBe(attempt === 0 ? 'poll-closed' : 'option-not-in-poll');
    }

    expect(transaction.pollVote.upsert).not.toHaveBeenCalled();
  });
});
