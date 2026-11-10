import { QuackReply } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { RepliesService } from './replies.service';

const author = { id: 'u2', role: 'user' } as Identity;
const someoneElse = { id: 'u3', role: 'user' } as Identity;
const admin = { id: 'admin1', role: 'admin' } as Identity;

const aReply: QuackReply = {
  id: 'r1',
  text: 'Same here!',
  quackId: 'q1',
  userId: 'u2',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u2', name: 'Deep Duck', username: 'DeepDuckThoughts' },
};

describe('RepliesService', () => {
  describe('addReply', () => {
    it('saves a trimmed reply by the signed-in user', async () => {
      const repository = mock<QuackRepository>();
      repository.findActiveQuackAuthorId.mockResolvedValue('u1');
      repository.createReply.mockResolvedValue(aReply);
      const service = new RepliesService(repository);

      await expect(
        service.addReply(author, 'q1', '  Same here!  '),
      ).resolves.toEqual(aReply);
      expect(repository.createReply).toHaveBeenCalledWith({
        quackId: 'q1',
        userId: 'u2',
        text: 'Same here!',
      });
    });

    it('refuses to reply to a missing or deleted quack', async () => {
      const repository = mock<QuackRepository>();
      repository.findActiveQuackAuthorId.mockResolvedValue(null);
      const service = new RepliesService(repository);

      await expect(service.addReply(author, 'q1', 'hi')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.createReply).not.toHaveBeenCalled();
    });
  });

  describe('deleteReply', () => {
    it('lets the author delete their reply', async () => {
      const repository = mock<QuackRepository>();
      repository.findReplyAuthorId.mockResolvedValue('u2');
      const service = new RepliesService(repository);

      await expect(service.deleteReply(author, 'r1')).resolves.toBeUndefined();
      expect(repository.deleteReply).toHaveBeenCalledWith('r1');
    });

    it('lets an admin delete any reply', async () => {
      const repository = mock<QuackRepository>();
      repository.findReplyAuthorId.mockResolvedValue('u2');
      const service = new RepliesService(repository);

      await expect(service.deleteReply(admin, 'r1')).resolves.toBeUndefined();
      expect(repository.deleteReply).toHaveBeenCalledWith('r1');
    });

    it("refuses to delete someone else's reply", async () => {
      const repository = mock<QuackRepository>();
      repository.findReplyAuthorId.mockResolvedValue('u2');
      const service = new RepliesService(repository);

      await expect(service.deleteReply(someoneElse, 'r1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.deleteReply).not.toHaveBeenCalled();
    });

    it('returns not found for a missing reply', async () => {
      const repository = mock<QuackRepository>();
      repository.findReplyAuthorId.mockResolvedValue(null);
      const service = new RepliesService(repository);

      await expect(service.deleteReply(author, 'r1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
