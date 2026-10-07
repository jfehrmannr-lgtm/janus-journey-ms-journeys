import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'UID of the owning User, Journey, or Folder.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  parentUid?: string;

  @ApiPropertyOptional({ example: 'Updated task name' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value: unknown) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: ['pending', 'in-progress', 'complete', 'in-pause', 'discarded'],
  })
  @IsOptional()
  @IsIn(['pending', 'in-progress', 'complete', 'in-pause', 'discarded'])
  state?: 'pending' | 'in-progress' | 'complete' | 'in-pause' | 'discarded';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  orderIndex?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
