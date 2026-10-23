import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BulkCreateFoldersDto } from '../dto/bulk-create-folder.dto.js';
import { BulkCreateFoldersResponseDto } from '../dto/bulk-create-folder-response.dto.js';
import { BulkDeleteFoldersDto } from '../dto/bulk-delete-folder.dto.js';
import { CreateFolderDto } from '../dto/create-folder.dto.js';
import { FolderResponseDto } from '../dto/folder-response.dto.js';
import { UpdateFolderDto } from '../dto/update-folder.dto.js';
import { FoldersService } from '../services/folders.service.js';
import { PaginationQueryDto } from '@common/pagination-query.dto.js';

@ApiTags('Folders')
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @ApiOperation({ summary: 'Create a Folder' })
  @ApiResponse({ status: 201, type: FolderResponseDto })
  @Post()
  create(
    @Body() input: CreateFolderDto,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<FolderResponseDto> {
    return this.foldersService.create(input, ownerUid);
  }

  @ApiOperation({
    summary: 'Bulk create Folders',
    description:
      'Creates multiple Folders in one request. Each item must reference an existing Journey and includes its own clientId for result correlation.',
  })
  @ApiBadRequestResponse({ description: 'Invalid bulk Folder request payload' })
  @ApiConflictResponse({
    description: 'A Folder violates a uniqueness constraint',
  })
  @ApiNotFoundResponse({ description: 'A referenced Journey was not found' })
  @ApiResponse({ status: 201, type: BulkCreateFoldersResponseDto })
  @Post('bulk')
  async bulkCreate(
    @Body() input: BulkCreateFoldersDto,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<BulkCreateFoldersResponseDto> {
    return {
      items: await this.foldersService.bulkCreate(input.items, ownerUid),
    };
  }

  @ApiOperation({ summary: 'List Folders' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/FolderResponseDto' },
        },
        totalRecords: { type: 'integer' },
      },
    },
  })
  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<{ items: FolderResponseDto[]; totalRecords: number }> {
    return this.foldersService.findAll(query, ownerUid);
  }

  @ApiOperation({ summary: 'Get a Folder by UID' })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        items: { $ref: '#/components/schemas/FolderResponseDto' },
      },
      type: 'object',
    },
  })
  @Get(':uid')
  async findByUid(
    @Param('uid') uid: string,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<{ items: FolderResponseDto }> {
    return { items: await this.foldersService.findByUid(uid, ownerUid) };
  }

  @ApiOperation({ summary: 'Partially update a Folder' })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  @ApiResponse({ status: 200, type: FolderResponseDto })
  @Patch(':uid')
  patch(
    @Param('uid') uid: string,
    @Body() input: UpdateFolderDto,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<FolderResponseDto> {
    return this.foldersService.update(uid, input, ownerUid);
  }

  @ApiOperation({
    summary: 'Bulk delete Folders and their Tasks',
    description:
      'Deletes the requested Folders and all Tasks belonging to them in one transaction. Missing Folder UIDs are ignored.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid bulk Folder deletion payload',
  })
  @ApiNoContentResponse({ description: 'Folders and their Tasks deleted' })
  @Delete('bulk')
  @HttpCode(204)
  async deleteBulk(@Body() input: BulkDeleteFoldersDto): Promise<void> {
    await this.foldersService.deleteBulk(input.ids);
  }

  @ApiOperation({
    summary: 'Delete a Folder and its Tasks',
    description:
      'Deletes the Folder and all Tasks belonging to it in one transaction.',
  })
  @ApiNoContentResponse({ description: 'Folder and its Tasks deleted' })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  @Delete(':uid')
  @HttpCode(204)
  async remove(@Param('uid') uid: string): Promise<void> {
    await this.foldersService.remove(uid);
  }
}
