import { Injectable } from '@nestjs/common';
import { BulkCreateTaskItemDto } from '../dto/bulk-create-task.dto.js';
import { CreateTaskDto } from '../dto/create-task.dto.js';
import { UpdateTaskDto } from '../dto/update-task.dto.js';
import { TasksRepository } from '../repositories/tasks.repository.js';
import type { Task } from '@journeys/types/journey.types.js';
import type { CollectionResult } from '@common/collection-result.js';
import {
  effectivePageSize,
  type PaginationQueryDto,
} from '@common/pagination-query.dto.js';

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  create(input: CreateTaskDto): Promise<Task> {
    return this.tasksRepository.create(input);
  }

  bulkCreate(
    inputs: BulkCreateTaskItemDto[],
  ): Promise<Array<{ clientId?: string; resource: Task }>> {
    return this.tasksRepository.bulkCreate(inputs);
  }

  findAll(query: PaginationQueryDto): Promise<CollectionResult<Task>> {
    return this.tasksRepository.findAll({
      ...query,
      size: effectivePageSize(query.size),
    });
  }

  findByUid(uid: string): Promise<Task> {
    return this.tasksRepository.findByUid(uid);
  }

  update(uid: string, input: UpdateTaskDto): Promise<Task> {
    return this.tasksRepository.update(uid, input);
  }

  remove(uid: string): Promise<void> {
    return this.tasksRepository.remove(uid);
  }
}
