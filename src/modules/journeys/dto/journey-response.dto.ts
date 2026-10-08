import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ enum: ['journey'] })
  type!: 'journey';

  @ApiProperty()
  parentUid!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    example: 'Description for journey',
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiProperty({ type: Object })
  metadata!: Record<string, unknown>;

  @ApiPropertyOptional({ type: ProgressResponseDto })
  progress?: ProgressResponseDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
