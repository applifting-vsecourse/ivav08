// Unit tests for the likes rules (cases.md, U1–U5). The repository is mocked:
// these check what the service decides, not how Postgres stores it.
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { LikesService } from './likes.service';

const me = { id: 'me', role: 'user' } as Identity;

function setup(activeQuackAuthorId: string | null) {
  const repository = mock<QuackRepository>();
  repository.findActiveQuackAuthorId.mockResolvedValue(activeQuackAuthorId);
  return { repository, service: new LikesService(repository) };
}

describe('LikesService', () => {
  describe('like', () => {
    it('U1: saves my like and returns the new like state', async () => {
      const { repository, service } = setup('author');
      repository.addLike.mockResolvedValue({ likeCount: 1, likedByMe: true });

      await expect(service.like(me, 'q1')).resolves.toEqual({
        likeCount: 1,
        likedByMe: true,
      });
      // the user comes from the session, never from the request
      expect(repository.addLike).toHaveBeenCalledWith('q1', 'me');
    });

    it('U2: a quack that does not exist cannot be liked', async () => {
      const { repository, service } = setup(null);

      await expect(service.like(me, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.addLike).not.toHaveBeenCalled();
    });

    it('U3: a deleted quack cannot be liked', async () => {
      // findActiveQuackAuthorId returns null for a tombstone (ADR 0001)
      const { repository, service } = setup(null);

      await expect(service.like(me, 'deleted')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.findActiveQuackAuthorId).toHaveBeenCalledWith(
        'deleted',
      );
      expect(repository.addLike).not.toHaveBeenCalled();
    });
  });

  describe('unlike', () => {
    it('U4: removes my like and returns the new like state', async () => {
      const { repository, service } = setup('author');
      repository.removeLike.mockResolvedValue({
        likeCount: 0,
        likedByMe: false,
      });

      await expect(service.unlike(me, 'q1')).resolves.toEqual({
        likeCount: 0,
        likedByMe: false,
      });
      expect(repository.removeLike).toHaveBeenCalledWith('q1', 'me');
    });

    it('U5: a missing or deleted quack cannot be unliked', async () => {
      const { repository, service } = setup(null);

      await expect(service.unlike(me, 'gone')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.removeLike).not.toHaveBeenCalled();
    });
  });
});
