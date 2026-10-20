import { ApiProperty } from '@nestjs/swagger';

export class QuackStatsResponseDto {
  @ApiProperty()
  quackCount!: number;

  @ApiProperty()
  pollCount!: number;

  @ApiProperty()
  voteCount!: number;
}
