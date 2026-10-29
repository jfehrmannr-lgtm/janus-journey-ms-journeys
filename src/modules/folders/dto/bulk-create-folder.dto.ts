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
import { CreateFolderDto } from './create-folder.dto.js';

export class BulkCreateFolderItemDto extends CreateFolderDto {
  @ApiPropertyOptional({
    description: 'Optional client correlation value. It is never persisted.',
    example: 'folder-client-1',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  clientId?: string;

  @ApiProperty({
    description:
      'The Folder parent. Valid examples are { uid: "user-123", type: "user" }, { uid: "journey-123", type: "journey" }, and { uid: "folder-123", type: "folder" }.',
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

export class BulkCreateFoldersDto {
  @ApiProperty({ type: [BulkCreateFolderItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateFolderItemDto)
  items!: BulkCreateFolderItemDto[];
}
