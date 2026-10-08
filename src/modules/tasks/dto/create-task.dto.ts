import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ description: 'UID of the owning User, Journey, or Folder.' })
  @IsString()
  @Length(1, 255)
  parentUid!: string;

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
