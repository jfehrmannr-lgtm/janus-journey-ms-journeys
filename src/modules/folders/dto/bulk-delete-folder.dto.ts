import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class BulkDeleteFoldersDto {
  @ApiProperty({
    description: 'Folder UIDs to delete. Missing UIDs are ignored.',
    example: ['folder-123', 'folder-456'],
    isArray: true,
    minItems: 1,
    type: String,
  })
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 255, { each: true })
  @Matches(/^folder-[A-Za-z0-9-]+$/, {
    each: true,
    message:
      'Each Folder UID must use the folder- prefix and contain only letters, numbers, or hyphens',
  })
  ids!: string[];
}
