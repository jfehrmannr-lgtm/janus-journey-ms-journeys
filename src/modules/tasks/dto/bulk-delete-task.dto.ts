import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class BulkDeleteTasksDto {
  @ApiProperty({
    description: 'Task UIDs to delete. Missing UIDs are ignored.',
    example: ['task-123', 'task-456'],
    isArray: true,
    minItems: 1,
    type: String,
  })
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 255, { each: true })
  @Matches(/^task-[A-Za-z0-9-]+$/, {
    each: true,
    message:
      'Each Task UID must use the task- prefix and contain only letters, numbers, or hyphens',
  })
  ids!: string[];
}
