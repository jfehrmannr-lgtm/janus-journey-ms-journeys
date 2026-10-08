import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TaskState } from '@journeys/types/journey.types.js';

export class TaskResponseDto {
  @ApiProperty()
  uid!: string;

  @ApiProperty({ enum: ['task'] })
  type!: 'task';

  @ApiProperty()
  parentUid!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'Description for task', nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true, type: String })
  taskType!: null;

  @ApiProperty({
    enum: ['pending', 'in-progress', 'complete', 'in-pause', 'discarded'],
  })
  state!: TaskState;

  @ApiProperty()
  isVisible!: boolean;

  @ApiPropertyOptional({ example: 100, type: Number })
  orderIndex?: unknown;

  @ApiProperty({ type: Object })
  metadata!: Record<string, unknown>;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
