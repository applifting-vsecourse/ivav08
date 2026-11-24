import { LikesService } from '@/modules/quack/services/likes.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QuackLikesResponseDto } from './dto/quack-likes.response.dto';

@ApiTags('likes')
@Controller('quacks/:quackId/like')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  // PUT and DELETE are idempotent: liking twice or unliking without a like
  // leaves the same state and is not an error.
  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Like a quack (yours too); liking twice counts once',
  })
  @ApiResponse({ status: 200, type: QuackLikesResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or deleted' })
  async like(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<QuackLikesResponseDto> {
    return QuackLikesResponseDto.fromDomain(
      await this.likesService.like(user, quackId),
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Take your like back; no like is not an error' })
  @ApiResponse({ status: 200, type: QuackLikesResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or deleted' })
  async unlike(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<QuackLikesResponseDto> {
    return QuackLikesResponseDto.fromDomain(
      await this.likesService.unlike(user, quackId),
    );
  }
}
