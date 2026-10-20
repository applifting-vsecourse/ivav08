import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchQuacksQueryDto {
  @ApiPropertyOptional({
    description: 'Search post text and author',
    maxLength: 280,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(280)
  search?: string;

  @ApiPropertyOptional({
    description: "Only the signed-in user's own quacks",
    type: Boolean,
  })
  // query strings arrive as text, so "true"/"false" are turned into booleans
  @Transform(({ value }): unknown => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  mine?: boolean;
}
