import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FolderResponseDto } from './folder-response.dto.js';

export class BulkCreatedFolderResponseDto {
  @ApiPropertyOptional({
    description: 'Returned only when the request item supplied clientId.',
    example: 'folder-client-1',
  })
  clientId?: string;

  @ApiProperty({ type: FolderResponseDto })
  resource!: FolderResponseDto;
}

export class BulkCreateFoldersResponseDto {
  @ApiProperty({ type: [BulkCreatedFolderResponseDto] })
  items!: BulkCreatedFolderResponseDto[];
}
