import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskResponseDto } from './task-response.dto.js';

export class BulkCreatedTaskResponseDto {
  @ApiPropertyOptional({
    description: 'Returned only when the request item supplied clientId.',
    example: 'task-client-1',
  })
  clientId?: string;

  @ApiProperty({ type: TaskResponseDto })
  resource!: TaskResponseDto;
}

export class BulkCreateTasksResponseDto {
  @ApiProperty({ type: [BulkCreatedTaskResponseDto] })
  items!: BulkCreatedTaskResponseDto[];
}
