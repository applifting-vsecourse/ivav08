import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CastPollVoteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}

export class UpdatePollOptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  id?: string;

  @ApiProperty({ maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label!: string;
}

export class UpdatePollDto {
  @ApiProperty({ maxLength: 280 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  question!: string;

  @ApiProperty({ type: [UpdatePollOptionDto], minItems: 2, maxItems: 6 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => UpdatePollOptionDto)
  options!: UpdatePollOptionDto[];
}

export class SetPollStatusDto {
  @ApiProperty({ enum: ['open', 'closed'] })
  @IsIn(['open', 'closed'])
  status!: 'open' | 'closed';
}
