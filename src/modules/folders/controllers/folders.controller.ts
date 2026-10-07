import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
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
  @ApiResponse({ isArray: true, status: 200, type: FolderResponseDto })
  @Get()
  findAll(): Promise<FolderResponseDto[]> {
    return this.foldersService.findAll();
  }

  @ApiOperation({ summary: 'Get a Folder by UID' })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  @ApiResponse({ status: 200, type: FolderResponseDto })
  @Get(':uid')
  findByUid(@Param('uid') uid: string): Promise<FolderResponseDto> {
    return this.foldersService.findByUid(uid);
  }

  @ApiOperation({ summary: 'Replace mutable Folder fields' })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  @ApiResponse({ status: 200, type: FolderResponseDto })
  @Put(':uid')
  update(
    @Param('uid') uid: string,
    @Body() input: UpdateFolderDto,
  ): Promise<FolderResponseDto> {
    return this.foldersService.update(uid, input);
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

  @ApiOperation({ summary: 'Delete a Folder without cascading' })
  @ApiNoContentResponse({ description: 'Folder deleted' })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  @Delete(':uid')
  @HttpCode(204)
  async remove(@Param('uid') uid: string): Promise<void> {
    await this.foldersService.remove(uid);
  }
}
