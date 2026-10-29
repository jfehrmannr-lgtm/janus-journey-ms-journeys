import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParentReferenceDto } from '@common/parent-reference.dto.js';

export class ProgressResponseDto {
  @ApiProperty()
  completed!: number;

  @ApiProperty()
  discarded!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  percentage!: number;
}

export class JourneyResponseDto {
  @ApiProperty()
  uid!: string;

  @ApiProperty()
  ownerUid!: string;

  @ApiProperty({ enum: ['journey'] })
  type!: 'journey';

  @ApiProperty({ type: ParentReferenceDto })
  parent!: ParentReferenceDto;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    example: 'Description for journey',
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiPropertyOptional({
    example: '/janus_journey_backgrounds/mount-sunrise.png',
  })
  imgUrl?: string;

  @ApiProperty({ type: Object })
  metadata!: Record<string, unknown>;

  @ApiPropertyOptional({ type: ProgressResponseDto })
  progress?: ProgressResponseDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({
    example: '2026-10-29T12:00:00.000Z',
    format: 'date-time',
  })
  lastActivityAt!: Date;
}
