import { Injectable } from '@nestjs/common';
import { calculateProgress } from '@common/progress.js';
import { FoldersRepository } from '../../folders/repositories/folders.repository.js';
import { JourneysRepository } from '../../journeys/repositories/journeys.repository.js';
import { TasksRepository } from '../../tasks/repositories/tasks.repository.js';
import type { Folder, Task } from '../../journeys/types/journey.types.js';
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

const getDescendantFolderUids = (
  parentUid: string,
  parentType: 'journey' | 'folder',
  foldersByParent: Map<string, Folder[]>,
): Set<string> => {
  const descendants = new Set<string>();
  const pending: Array<{ uid: string; type: 'journey' | 'folder' }> = [
    { uid: parentUid, type: parentType },
  ];

  while (pending.length > 0) {
    const parent = pending.pop();
    if (!parent) continue;

    for (const folder of foldersByParent.get(`${parent.type}:${parent.uid}`) ??
      []) {
      if (descendants.has(folder.uid)) continue;
      descendants.add(folder.uid);
      pending.push({ type: 'folder', uid: folder.uid });
    }
  }

  return descendants;
};

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
    const folderParents = [
      ...journeys.map((journey) => ({
        type: 'journey' as const,
        uid: journey.uid,
      })),
      ...folders.map((folder) => ({
        type: 'folder' as const,
        uid: folder.uid,
      })),
    ];
    const descendantFolders = await this.findDescendantFolders(folderParents);
    const allFolders = [...folders, ...descendantFolders];
    const taskParents = [
      ...journeys.map((journey) => ({
        type: 'journey' as const,
        uid: journey.uid,
      })),
      ...allFolders.map((folder) => ({
        type: 'folder' as const,
        uid: folder.uid,
      })),
    ];
    const progressTasks =
      (await this.tasksRepository.findByParentUids(taskParents)) ?? [];
    const foldersByParent = this.groupFoldersByParent(allFolders);
    const tasksByParent = this.groupTasksByParent(progressTasks);
    const foldersWithProgress = folders.map((folder) => ({
      ...folder,
      progress: calculateProgress(
        [...getDescendantFolderUids(folder.uid, 'folder', foldersByParent)]
          .flatMap((uid) => tasksByParent.get(uid) ?? [])
          .concat(tasksByParent.get(folder.uid) ?? []),
      ),
    }));
    const journeysWithProgress = journeys.map((journey) => ({
      ...journey,
      progress: calculateProgress(
        [
          journey.uid,
          ...getDescendantFolderUids(journey.uid, 'journey', foldersByParent),
        ].flatMap((uid) => tasksByParent.get(uid) ?? []),
      ),
    }));
    const items: UserRootItemsDto = {
      folders: foldersWithProgress,
      journeys: journeysWithProgress,
      tasks,
    };

    return {
      items,
      registers: [tasks, folders, journeys].filter(
        (resources) => resources.length > 0,
      ).length,
    };
  }

  private async findDescendantFolders(
    parents: Array<{ uid: string; type: 'journey' | 'folder' }>,
  ): Promise<Folder[]> {
    const folders: Folder[] = [];
    let pending = parents;
    const seen = new Set<string>();

    while (pending.length > 0) {
      const children =
        (await this.foldersRepository.findByParentUids(pending)) ?? [];
      pending = children
        .filter((folder) => !seen.has(folder.uid))
        .map((folder) => ({ type: 'folder' as const, uid: folder.uid }));
      for (const folder of children) {
        if (seen.has(folder.uid)) continue;
        seen.add(folder.uid);
        folders.push(folder);
      }
    }

    return folders;
  }

  private groupFoldersByParent(folders: Folder[]): Map<string, Folder[]> {
    const grouped = new Map<string, Folder[]>();
    for (const folder of folders) {
      if (!folder.parent) continue;
      const key = `${folder.parent.type}:${folder.parent.uid}`;
      grouped.set(key, [...(grouped.get(key) ?? []), folder]);
    }
    return grouped;
  }

  private groupTasksByParent(tasks: Task[]): Map<string, Task[]> {
    const grouped = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.parent) continue;
      grouped.set(task.parent.uid, [
        ...(grouped.get(task.parent.uid) ?? []),
        task,
      ]);
    }
    return grouped;
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
