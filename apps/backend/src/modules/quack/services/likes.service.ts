import { QuackLikes } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

/** Likes on quacks. Rules: docs in cases.md, storage in ADR 0002. */
@Injectable()
export class LikesService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async like(user: Identity, quackId: string): Promise<QuackLikes> {
    void this.quackRepository;
    void user;
    void quackId;
    throw new Error('not implemented');
  }

  async unlike(user: Identity, quackId: string): Promise<QuackLikes> {
    void user;
    void quackId;
    throw new Error('not implemented');
  }
}
