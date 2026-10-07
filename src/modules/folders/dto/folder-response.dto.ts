import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressResponseDto } from '../../journeys/dto/journey-response.dto.js';

export class FolderResponseDto {
  @ApiProperty()
  uid!: string;

  @ApiProperty({ enum: ['folder'] })
  type!: 'folder';

  @ApiProperty()
  parentUid!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: Object })
  orderIndex?: unknown;

  @ApiProperty({ type: Object })
  metadata!: Record<string, unknown>;

  @ApiPropertyOptional({ type: ProgressResponseDto })
  progress?: ProgressResponseDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
