import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  create(@Body() input: CreateFolderDto): Promise<FolderResponseDto> {
    return this.foldersService.create(input);
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
  ): Promise<{ items: FolderResponseDto[]; totalRecords: number }> {
    return this.foldersService.findAll(query);
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
  ): Promise<{ items: FolderResponseDto }> {
    return { items: await this.foldersService.findByUid(uid) };
  }

  @ApiOperation({ summary: 'Partially update a Folder' })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  @ApiResponse({ status: 200, type: FolderResponseDto })
  @Patch(':uid')
  patch(
    @Param('uid') uid: string,
    @Body() input: UpdateFolderDto,
  ): Promise<FolderResponseDto> {
    return this.foldersService.update(uid, input);
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
