import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDefined,
  IsArray,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { ParentReferenceDto } from '@common/parent-reference.dto.js';
import { CreateTaskDto } from './create-task.dto.js';

export class BulkCreateTaskItemDto extends CreateTaskDto {
  @ApiPropertyOptional({
    description: 'Optional client correlation value. It is never persisted.',
    example: 'task-client-1',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  clientId?: string;

  @ApiProperty({
    description:
      'The Task parent. Valid examples are { uid: "user-123", type: "user" }, { uid: "journey-123", type: "journey" }, and { uid: "folder-123", type: "folder" }.',
    examples: [
      { uid: 'user-123', type: 'user' },
      { uid: 'journey-123', type: 'journey' },
      { uid: 'folder-123', type: 'folder' },
    ],
    type: ParentReferenceDto,
  })
  @ValidateNested()
  @Type(() => ParentReferenceDto)
  @IsDefined()
  declare parent: ParentReferenceDto;
}

export class BulkCreateTasksDto {
  @ApiProperty({ type: [BulkCreateTaskItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateTaskItemDto)
  items!: BulkCreateTaskItemDto[];
}
