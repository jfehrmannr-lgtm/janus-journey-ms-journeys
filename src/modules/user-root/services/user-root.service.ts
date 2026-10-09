import { Injectable } from '@nestjs/common';
import { FoldersRepository } from '../../folders/repositories/folders.repository.js';
import { JourneysRepository } from '../../journeys/repositories/journeys.repository.js';
import { TasksRepository } from '../../tasks/repositories/tasks.repository.js';
import type { ResourceParamsDto } from '../dto/user-root-params.dto.js';
import type {
  ResourceResponseDto,
  UserRootItemsDto,
  UserRootResponseDto,
} from '../dto/user-root-response.dto.js';

const sortByOrderIndex = <T extends { orderIndex: unknown }>(
  resources: T[],
): T[] =>
  [...resources].sort(
    (first, second) =>
      Number(first.orderIndex ?? 0) - Number(second.orderIndex ?? 0),
  );

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

  async findResource(params: ResourceParamsDto): Promise<ResourceResponseDto> {
    if (params.resourceType === 'journey') {
      const journey = await this.journeysRepository.findByUid(
        params.resourceId,
      );
      const folders = sortByOrderIndex(
        await this.foldersRepository.findByJourneyUid(params.resourceId),
      );
      const tasks = sortByOrderIndex(
        await this.tasksRepository.findByParentUids([
          { type: 'journey', uid: params.resourceId },
          ...folders.map((folder) => ({
            type: 'folder' as const,
            uid: folder.uid,
          })),
        ]),
      );
      const tasksByFolderUid = new Map<string, typeof tasks>();

      for (const task of tasks) {
        if (task.parent.type !== 'folder') continue;
        const folderTasks = tasksByFolderUid.get(task.parent.uid) ?? [];
        folderTasks.push(task);
        tasksByFolderUid.set(task.parent.uid, folderTasks);
      }

      return {
        items: {
          ...journey,
          folders: folders.map((folder) => ({
            ...folder,
            tasks: tasksByFolderUid.get(folder.uid) ?? [],
          })),
          tasks: tasks.filter((task) => task.parent.type === 'journey'),
        },
      };
    }

    if (params.resourceType === 'folder') {
      const folder = await this.foldersRepository.findByUid(params.resourceId);
      const tasks = sortByOrderIndex(
        await this.tasksRepository.findByParentUids([
          { type: 'folder', uid: params.resourceId },
        ]),
      );

      return { items: { ...folder, tasks } };
    }

    const task = await this.tasksRepository.findByUid(params.resourceId);
    return { items: task };
  }
}
