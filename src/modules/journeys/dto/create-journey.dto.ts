import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export class CreateJourneyDto {
  @ApiProperty({ description: 'UID of the owning User.' })
  @IsString()
  @Length(1, 255)
  parentUid!: string;

  @ApiProperty({ example: 'Learn web development' })
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'A structured learning path.',
  })
  @ValidateIf((_, value: unknown) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
