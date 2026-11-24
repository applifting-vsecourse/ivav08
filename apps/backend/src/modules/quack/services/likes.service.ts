import { QuackLikes } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/**
 * Likes on quacks (cases.md, ADR 0002). Anyone signed in may like any live
 * quack, their own included; liking twice and unliking without a like are
 * not errors. A deleted quack (ADR 0001) can't be liked: 404.
 */
@Injectable()
export class LikesService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async like(user: Identity, quackId: string): Promise<QuackLikes> {
    await this.assertQuackIsLive(quackId);
    // the user always comes from the session
    return this.orNotFound(
      await this.retryOnConflict(() =>
        this.quackRepository.addLike(quackId, user.id),
      ),
    );
  }

  async unlike(user: Identity, quackId: string): Promise<QuackLikes> {
    await this.assertQuackIsLive(quackId);
    return this.orNotFound(
      await this.retryOnConflict(() =>
        this.quackRepository.removeLike(quackId, user.id),
      ),
    );
  }

  private async assertQuackIsLive(quackId: string): Promise<void> {
    // null for a quack that doesn't exist and for a tombstone
    const authorId =
      await this.quackRepository.findActiveQuackAuthorId(quackId);
    if (!authorId) throw new NotFoundException('Quack not found');
  }

  /** The quack was deleted between the check and the write. */
  private orNotFound(likes: QuackLikes | null): QuackLikes {
    if (!likes) throw new NotFoundException('Quack not found');
    return likes;
  }

  /**
   * Serializable transactions abort when two writes on the same quack
   * collide (P2034). Liking is idempotent, so one retry is safe.
   */
  private async retryOnConflict<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      try {
        return await write();
      } catch (retryError) {
        if (!isSerializationFailure(retryError)) throw retryError;
        throw new ConflictException('The quack changed meanwhile. Try again.');
      }
    }
  }
}

function isSerializationFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'P2034' || error.code === 'P2002')
  );
}
