import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { PollVotesService } from './poll-votes.service';

describe('PollVotesService', () => {
  const user = { id: 'u1' } as Identity;

  it('casts or changes a vote for the signed-in user', async () => {
    const repository = mock<QuackRepository>();
    repository.castPollVote.mockResolvedValue('ok');
    const service = new PollVotesService(repository);

    await expect(service.vote(user, 'p1', 'o2')).resolves.toBeUndefined();
    expect(repository.castPollVote).toHaveBeenCalledWith('p1', 'o2', 'u1');
  });

  it('rejects voting in a closed poll', async () => {
    const repository = mock<QuackRepository>();
    repository.castPollVote.mockResolvedValue('poll-closed');
    const service = new PollVotesService(repository);

    await expect(service.vote(user, 'p1', 'o1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects an option from another poll', async () => {
    const repository = mock<QuackRepository>();
    repository.castPollVote.mockResolvedValue('option-not-in-poll');
    const service = new PollVotesService(repository);

    await expect(service.vote(user, 'p1', 'o2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns not found when the poll does not exist', async () => {
    const repository = mock<QuackRepository>();
    repository.cancelPollVote.mockResolvedValue('poll-not-found');
    const service = new PollVotesService(repository);

    await expect(service.cancelVote(user, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
