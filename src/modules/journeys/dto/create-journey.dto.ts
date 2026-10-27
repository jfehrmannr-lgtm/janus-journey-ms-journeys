import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsObject,
  IsDefined,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ParentReferenceDto } from '@common/parent-reference.dto.js';

export class CreateJourneyDto {
  @ApiProperty({ type: ParentReferenceDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ParentReferenceDto)
  parent!: ParentReferenceDto;

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

  @ApiProperty({ example: '/janus_journey_backgrounds/mount-sunrise.png' })
  @IsString()
  imgUrl!: string;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
