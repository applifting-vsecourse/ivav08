import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { LikesController } from './controllers/likes.controller';
import { PollsController } from './controllers/polls.controller';
import { QuacksController } from './controllers/quacks.controller';
import { RepliesController } from './controllers/replies.controller';
import { QuackRepository } from './repositories/quack.repository';
import { LikesService } from './services/likes.service';
import { PollManagementService } from './services/poll-management.service';
import { PollVotesService } from './services/poll-votes.service';
import { QuacksService } from './services/quacks.service';
import { RepliesService } from './services/replies.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    QuacksController,
    PollsController,
    RepliesController,
    LikesController,
  ],
  providers: [
    QuacksService,
    QuackRepository,
    PollVotesService,
    PollManagementService,
    RepliesService,
    LikesService,
  ],
  exports: [QuacksService],
})
export class QuackModule {}
