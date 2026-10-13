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

const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export class CreatePollDto {
  @ApiProperty({ maxLength: 280 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  question!: string;

  @ApiProperty({ type: [String], minItems: 2, maxItems: 6, maxLength: 80 })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((option) =>
          typeof option === 'string' ? option.trim() : option,
        )
      : value,
  )
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(80, { each: true })
  options!: string[];
}

export class CreateQuackDto {
  @ApiPropertyOptional({
    description: 'Body of the quack',
    example: 'Hello, world!',
    maxLength: 280,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(280)
  text?: string;

  @ApiPropertyOptional({ enum: QUACK_MOODS })
  @IsOptional()
  @IsIn(QUACK_MOODS)
  mood?: (typeof QUACK_MOODS)[number];

  @ApiPropertyOptional({ type: [CreatePollDto], maxItems: 3 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CreatePollDto)
  polls?: CreatePollDto[];
}
