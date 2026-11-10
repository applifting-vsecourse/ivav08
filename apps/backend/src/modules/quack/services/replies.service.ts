import { QuackReply } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class RepliesService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async addReply(
    user: Identity,
    quackId: string,
    text: string,
  ): Promise<QuackReply> {
    // Deleted quacks (tombstones, ADR 0001) can't be replied to.
    const quackAuthorId =
      await this.quackRepository.findActiveQuackAuthorId(quackId);
    if (!quackAuthorId) {
      throw new NotFoundException('Quack not found');
    }

    // the author is taken from the session, never from the request body
    return this.quackRepository.createReply({
      quackId,
      userId: user.id,
      text: text.trim(),
    });
  }

  async deleteReply(user: Identity, replyId: string): Promise<void> {
    const authorId = await this.quackRepository.findReplyAuthorId(replyId);
    if (!authorId) {
      throw new NotFoundException('Reply not found');
    }

    // Same rule as quacks: the author or an admin, checked on the server.
    const isOwner = authorId === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You can only delete your own replies');
    }

    await this.quackRepository.deleteReply(replyId);
  }
}
