import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export class CreateQuackDto {
  @ApiProperty({
    description: 'Body of the quack',
    example: 'Hello, world!',
    maxLength: 280,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text!: string;

  @ApiPropertyOptional({ enum: QUACK_MOODS })
  @IsOptional()
  @IsIn(QUACK_MOODS)
  mood?: (typeof QUACK_MOODS)[number];
}
