import { QuacksService } from '@/modules/quack/services/quacks.service';
import { Roles } from '@/shared/auth/decorators/roles.decorator';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { RolesGuard } from '@/shared/auth/guards/roles.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import { CreateQuackDto } from './dto/create-quack.dto';
import { QuackStatsResponseDto } from './dto/quack-stats.response.dto';
import { QuackResponseDto } from './dto/quack.response.dto';
import { SearchQuacksQueryDto } from './dto/search-quacks-query.dto';

@ApiTags('quacks')
@Controller('quacks')
// order matters: sign-in first (401), then the role check (403)
@UseGuards(AuthenticatedUserGuard, RolesGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class QuacksController {
  constructor(private readonly quacksService: QuacksService) {}

  @Get()
  @ApiOperation({ summary: 'List all quacks' })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @User() user: Identity,
    @Query() query: SearchQuacksQueryDto,
  ): Promise<QuackResponseDto[]> {
    const quacks = await this.quacksService.getQuacks(
      query.search,
      user.id,
      query.mine ?? false,
    );
    return quacks.map(QuackResponseDto.fromDomain);
  }

  // Declared before any `:id` route — Nest matches routes in order.
  @Get('stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Feed statistics (admins only)' })
  @ApiResponse({ status: 200, type: QuackStatsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  async stats(): Promise<QuackStatsResponseDto> {
    return this.quacksService.getStats();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quack' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @User() user: Identity,
    @Body() body: CreateQuackDto,
  ): Promise<QuackResponseDto> {
    const quack = await this.quacksService.createQuack(user, {
      text: body.text,
      mood: body.mood,
      polls: body.polls,
    });
    return QuackResponseDto.fromDomain(quack);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a quack (your own, or any quack if you are an admin)',
  })
  @ApiResponse({ status: 204, description: 'Quack deleted' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not your quack and not an admin' })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async delete(@User() user: Identity, @Param('id') id: string): Promise<void> {
    // the user comes from the session; the service decides if they may delete
    await this.quacksService.deleteQuack(user, id);
  }
}
