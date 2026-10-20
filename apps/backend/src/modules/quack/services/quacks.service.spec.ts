// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  polls: [],
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  ...overrides,
});

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(undefined, 'u1')).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledWith(
      undefined,
      'u1',
      undefined,
    );
  });

  it('forwards a normalized search term to the repository', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    const service = new QuacksService(repository);

    await expect(service.getQuacks('  pond  ', 'u1')).resolves.toEqual([]);
    expect(repository.getQuacks).toHaveBeenCalledWith(
      'pond',
      'u1',
      undefined,
    );
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello', mood: 'happy' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'hello', mood: 'happy' }),
    ).resolves.toEqual(created);
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: 'happy',
      userId: 'u1',
      polls: [],
    });
  });

  it('creates a poll post without context text and normalizes its options', async () => {
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(aQuack({ text: '', polls: [] }));
    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await service.createQuack(user, {
      polls: [{ question: 'Where to eat?', options: ['Cafe', 'Park'] }],
    });

    expect(repository.createQuack).toHaveBeenCalledWith({
      text: '',
      mood: undefined,
      userId: 'u1',
      polls: [{ question: 'Where to eat?', options: ['Cafe', 'Park'] }],
    });
  });

  it('rejects duplicate poll options after trim and case normalization', async () => {
    const repository = mock<QuackRepository>();
    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, {
        polls: [{ question: 'Where to eat?', options: ['Cafe', ' cafe '] }],
      }),
    ).rejects.toThrow('Poll options must be unique');
    expect(repository.createQuack).not.toHaveBeenCalled();
  });

  it("limits the feed to the signed-in user's own quacks for Mine", async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);
    const service = new QuacksService(repository);

    await service.getQuacks(undefined, 'u1', true);

    // the author filter is the viewer from the session, not a request value
    expect(repository.getQuacks).toHaveBeenCalledWith(undefined, 'u1', 'u1');
  });

  describe('deleteQuack', () => {
    const owner = { id: 'u1', role: 'user' } as Identity;
    const someoneElse = { id: 'u2', role: 'user' } as Identity;

    it('lets the author delete their own quack', async () => {
      const repository = mock<QuackRepository>();
      repository.findQuackAuthorId.mockResolvedValue('u1');
      const service = new QuacksService(repository);

      await expect(service.deleteQuack(owner, 'q1')).resolves.toBeUndefined();
      expect(repository.deleteQuack).toHaveBeenCalledWith('q1');
    });

    it("refuses to delete someone else's quack", async () => {
      const repository = mock<QuackRepository>();
      repository.findQuackAuthorId.mockResolvedValue('u1');
      const service = new QuacksService(repository);

      await expect(service.deleteQuack(someoneElse, 'q1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it('returns not found for a quack that does not exist', async () => {
      const repository = mock<QuackRepository>();
      repository.findQuackAuthorId.mockResolvedValue(null);
      const service = new QuacksService(repository);

      await expect(service.deleteQuack(owner, 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });
  });
});
