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
import { BulkCreateTasksDto } from '../dto/bulk-create-task.dto.js';
import { BulkCreateTasksResponseDto } from '../dto/bulk-create-task-response.dto.js';
import { BulkDeleteTasksDto } from '../dto/bulk-delete-task.dto.js';
import { CreateTaskDto } from '../dto/create-task.dto.js';
import { TaskResponseDto } from '../dto/task-response.dto.js';
import { UpdateTaskDto } from '../dto/update-task.dto.js';
import { TasksService } from '../services/tasks.service.js';
import { PaginationQueryDto } from '@common/pagination-query.dto.js';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Create a Task' })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  @Post()
  create(
    @Body() input: CreateTaskDto,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(input, ownerUid);
  }

  @ApiOperation({
    summary: 'Bulk create Tasks',
    description:
      'Creates multiple Tasks in one request. Each item may reference an existing Journey or Folder and includes its own clientId for result correlation.',
  })
  @ApiBadRequestResponse({ description: 'Invalid bulk Task request payload' })
  @ApiConflictResponse({
    description: 'A Task violates a uniqueness constraint',
  })
  @ApiNotFoundResponse({
    description: 'A referenced Journey or Folder was not found',
  })
  @ApiResponse({ status: 201, type: BulkCreateTasksResponseDto })
  @Post('bulk')
  async bulkCreate(
    @Body() input: BulkCreateTasksDto,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<BulkCreateTasksResponseDto> {
    return {
      items: await this.tasksService.bulkCreate(input.items, ownerUid),
    };
  }

  @ApiOperation({ summary: 'List Tasks' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/TaskResponseDto' },
        },
        totalRecords: { type: 'integer' },
      },
    },
  })
  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<{ items: TaskResponseDto[]; totalRecords: number }> {
    return this.tasksService.findAll(query, ownerUid);
  }

  @ApiOperation({ summary: 'Get a Task by UID' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        items: { $ref: '#/components/schemas/TaskResponseDto' },
      },
      type: 'object',
    },
  })
  @Get(':uid')
  async findByUid(
    @Param('uid') uid: string,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<{ items: TaskResponseDto }> {
    return { items: await this.tasksService.findByUid(uid, ownerUid) };
  }

  @ApiOperation({ summary: 'Partially update a Task' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @Patch(':uid')
  patch(
    @Param('uid') uid: string,
    @Body() input: UpdateTaskDto,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(uid, input, ownerUid);
  }

  @ApiOperation({
    summary: 'Bulk delete Tasks',
    description:
      'Deletes the requested Tasks in one transaction. Missing Task UIDs are ignored.',
  })
  @ApiBadRequestResponse({ description: 'Invalid bulk Task deletion payload' })
  @ApiNoContentResponse({ description: 'Tasks deleted' })
  @Delete('bulk')
  @HttpCode(204)
  async deleteBulk(
    @Body() input: BulkDeleteTasksDto,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<void> {
    await this.tasksService.deleteBulk(input.ids, ownerUid);
  }

  @ApiOperation({
    summary: 'Delete a Task',
    description:
      'Deletes the requested Task. Tasks do not contain child resources, so no additional records are deleted.',
  })
  @ApiNoContentResponse({ description: 'Task deleted' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @Delete(':uid')
  @HttpCode(204)
  async remove(
    @Param('uid') uid: string,
    @Headers('x-user-id') ownerUid: string,
  ): Promise<void> {
    await this.tasksService.remove(uid, ownerUid);
  }
}
