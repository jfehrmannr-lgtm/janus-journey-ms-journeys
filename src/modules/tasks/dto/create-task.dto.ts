import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ParentReferenceDto } from '@common/parent-reference.dto.js';

export class CreateTaskDto {
  @ApiProperty({ type: ParentReferenceDto })
  @ValidateNested()
  @Type(() => ParentReferenceDto)
  parent!: ParentReferenceDto;

  @ApiProperty({ example: 'Understand HTTP' })
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiPropertyOptional({ example: 'Description for task', nullable: true })
  @ValidateIf((_, value: unknown) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @ApiProperty({
    enum: ['pending', 'in-progress', 'complete', 'in-pause', 'discarded'],
  })
  @IsIn(['pending', 'in-progress', 'complete', 'in-pause', 'discarded'])
  state!: 'pending' | 'in-progress' | 'complete' | 'in-pause' | 'discarded';

  @ApiProperty({ default: true })
  @IsBoolean()
  isVisible!: boolean;

  @ApiPropertyOptional({ example: 100, type: Number })
  @IsOptional()
  orderIndex?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
