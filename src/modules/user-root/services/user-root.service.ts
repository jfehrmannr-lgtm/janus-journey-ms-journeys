import { Injectable } from '@nestjs/common';
import { FoldersRepository } from '../../folders/repositories/folders.repository.js';
import { JourneysRepository } from '../../journeys/repositories/journeys.repository.js';
import { TasksRepository } from '../../tasks/repositories/tasks.repository.js';
import type {
  UserRootItemsDto,
  UserRootResponseDto,
} from '../dto/user-root-response.dto.js';

@Injectable()
export class UserRootService {
  constructor(
    private readonly journeysRepository: JourneysRepository,
    private readonly foldersRepository: FoldersRepository,
    private readonly tasksRepository: TasksRepository,
  ) {}

  async findByUserId(userId: string): Promise<UserRootResponseDto> {
    const [journeys, folders, tasks] = await Promise.all([
      this.journeysRepository.findByUserId(userId),
      this.foldersRepository.findByUserId(userId),
      this.tasksRepository.findByUserId(userId),
    ]);
    const items: UserRootItemsDto = {
      folders,
      journeys,
      tasks,
    };

    return {
      items,
      registers: [tasks, folders, journeys].filter(
        (resources) => resources.length > 0,
      ).length,
    };
  }
}
