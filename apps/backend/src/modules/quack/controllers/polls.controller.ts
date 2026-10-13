import { PollManagementService } from '@/modules/quack/services/poll-management.service';
import { PollVotesService } from '@/modules/quack/services/poll-votes.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CastPollVoteDto,
  SetPollStatusDto,
  UpdatePollDto,
} from './dto/cast-poll-vote.dto';

@ApiTags('polls')
@Controller()
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PollsController {
  constructor(
    private readonly pollVotesService: PollVotesService,
    private readonly pollManagementService: PollManagementService,
  ) {}

  @Post('polls/:pollId/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cast or change a vote' })
  @ApiResponse({ status: 200, description: 'Vote saved' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async vote(
    @User() user: Identity,
    @Param('pollId') pollId: string,
    @Body() body: CastPollVoteDto,
  ): Promise<{ success: true }> {
    await this.pollVotesService.vote(user, pollId, body.optionId);
    return { success: true };
  }

  @Delete('polls/:pollId/vote')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a vote' })
  @ApiResponse({ status: 204, description: 'Vote cancelled' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async cancelVote(
    @User() user: Identity,
    @Param('pollId') pollId: string,
  ): Promise<void> {
    await this.pollVotesService.cancelVote(user, pollId);
  }

  @Patch('polls/:pollId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Edit a poll and its answers' })
  @ApiResponse({ status: 204, description: 'Poll updated' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async updatePoll(
    @User() user: Identity,
    @Param('pollId') pollId: string,
    @Body() body: UpdatePollDto,
  ): Promise<void> {
    await this.pollManagementService.updatePoll(
      user,
      pollId,
      body.question,
      body.options,
    );
  }

  @Patch('polls/:pollId/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Open or close a poll' })
  @ApiResponse({ status: 204, description: 'Poll status updated' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async setPollStatus(
    @User() user: Identity,
    @Param('pollId') pollId: string,
    @Body() body: SetPollStatusDto,
  ): Promise<void> {
    await this.pollManagementService.setPollStatus(user, pollId, body.status);
  }

  @Patch('quacks/:quackId/polls/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Open or close all polls on a post' })
  @ApiResponse({ status: 204, description: 'Poll statuses updated' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async setQuackPollStatus(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: SetPollStatusDto,
  ): Promise<void> {
    await this.pollManagementService.setQuackPollStatus(
      user,
      quackId,
      body.status,
    );
  }
}
