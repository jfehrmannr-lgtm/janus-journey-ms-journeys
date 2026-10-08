import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressResponseDto } from '@journeys/dto/journey-response.dto.js';

export class FolderResponseDto {
  @ApiProperty()
  uid!: string;

  @ApiProperty({ enum: ['folder'] })
  type!: 'folder';

  @ApiProperty()
  parentUid!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    example: 'Description for folder',
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiPropertyOptional({ example: 100, type: Number })
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
