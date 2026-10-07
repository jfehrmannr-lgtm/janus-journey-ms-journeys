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
  Put,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  create(@Body() input: CreateTaskDto): Promise<TaskResponseDto> {
    return this.tasksService.create(input);
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
  ): Promise<{ items: TaskResponseDto[]; totalRecords: number }> {
    return this.tasksService.findAll(query);
  }

  @ApiOperation({ summary: 'Get a Task by UID' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @Get(':uid')
  findByUid(@Param('uid') uid: string): Promise<TaskResponseDto> {
    return this.tasksService.findByUid(uid);
  }

  @ApiOperation({ summary: 'Replace mutable Task fields' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @Put(':uid')
  update(
    @Param('uid') uid: string,
    @Body() input: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(uid, input);
  }

  @ApiOperation({ summary: 'Partially update a Task' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @Patch(':uid')
  patch(
    @Param('uid') uid: string,
    @Body() input: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(uid, input);
  }

  @ApiOperation({ summary: 'Delete a Task without cascading' })
  @ApiNoContentResponse({ description: 'Task deleted' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @Delete(':uid')
  @HttpCode(204)
  async remove(@Param('uid') uid: string): Promise<void> {
    await this.tasksService.remove(uid);
  }
}
