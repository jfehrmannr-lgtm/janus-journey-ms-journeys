import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ParentReferenceDto } from '@common/parent-reference.dto.js';

export class UpdateJourneyDto {
  @ApiPropertyOptional({ type: ParentReferenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParentReferenceDto)
  parent?: ParentReferenceDto;

  @ApiPropertyOptional({ example: 'Updated Journey name' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value: unknown) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
