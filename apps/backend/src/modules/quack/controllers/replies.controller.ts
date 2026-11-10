import { RepliesService } from '@/modules/quack/services/replies.service';
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
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReplyResponseDto } from './dto/quack.response.dto';

@ApiTags('replies')
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
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  @Post('quacks/:quackId/replies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a quack' })
  @ApiResponse({ status: 201, type: ReplyResponseDto })
  @ApiResponse({ status: 400, description: 'Empty or too long reply' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or deleted' })
  async create(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: CreateReplyDto,
  ): Promise<ReplyResponseDto> {
    const reply = await this.repliesService.addReply(user, quackId, body.text);
    return ReplyResponseDto.fromDomain(reply);
  }

  @Delete('replies/:replyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a reply (your own, or any reply if you are an admin)',
  })
  @ApiResponse({ status: 204, description: 'Reply deleted' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not your reply and not an admin' })
  @ApiResponse({ status: 404, description: 'Reply not found' })
  async delete(
    @User() user: Identity,
    @Param('replyId') replyId: string,
  ): Promise<void> {
    await this.repliesService.deleteReply(user, replyId);
  }
}
