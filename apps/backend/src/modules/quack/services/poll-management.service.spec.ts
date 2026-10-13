import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { PollManagementService } from './poll-management.service';

describe('PollManagementService', () => {
  const user = { id: 'owner' } as Identity;

  it('updates question and answer labels while preserving option IDs', async () => {
    const repository = mock<QuackRepository>();
    repository.updatePoll.mockResolvedValue('ok');
    const service = new PollManagementService(repository);
    const options = [
      { id: 'o1', label: 'Cafe' },
      { id: 'o2', label: 'Park' },
    ];

    await expect(
      service.updatePoll(user, 'p1', 'Where to go?', options),
    ).resolves.toBeUndefined();
    expect(repository.updatePoll).toHaveBeenCalledWith(
      'p1',
      'owner',
      'Where to go?',
      options,
    );
  });

  it('rejects removal of an answer that already has votes', async () => {
    const repository = mock<QuackRepository>();
    repository.updatePoll.mockResolvedValue('option-has-votes');
    const service = new PollManagementService(repository);

    await expect(
      service.updatePoll(user, 'p1', 'Where?', [
        { id: 'o1', label: 'Cafe' },
        { id: 'o3', label: 'Park' },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a poll edit by a non-author', async () => {
    const repository = mock<QuackRepository>();
    repository.updatePoll.mockResolvedValue('forbidden');
    const service = new PollManagementService(repository);

    await expect(
      service.updatePoll(user, 'p1', 'Where?', [
        { id: 'o1', label: 'Cafe' },
        { id: 'o2', label: 'Park' },
      ]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forwards reopen requests for individual and all polls', async () => {
    const repository = mock<QuackRepository>();
    repository.setPollStatus.mockResolvedValue('ok');
    repository.setQuackPollStatus.mockResolvedValue('ok');
    const service = new PollManagementService(repository);

    await service.setPollStatus(user, 'p1', 'open');
    await service.setQuackPollStatus(user, 'q1', 'open');

    expect(repository.setPollStatus).toHaveBeenCalledWith(
      'p1',
      'owner',
      'open',
    );
    expect(repository.setQuackPollStatus).toHaveBeenCalledWith(
      'q1',
      'owner',
      'open',
    );
  });
});
