import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from '../dto/create-task.dto.js';
import { UpdateTaskDto } from '../dto/update-task.dto.js';
import { TasksRepository } from '../repositories/tasks.repository.js';
import type { Task } from '../../journeys/types/journey.types.js';

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  create(input: CreateTaskDto): Promise<Task> {
    return this.tasksRepository.create(input);
  }

  findAll(): Promise<Task[]> {
    return this.tasksRepository.findAll();
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
