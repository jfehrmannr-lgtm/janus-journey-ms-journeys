import { describe, expect, it, jest } from '@jest/globals';
import { UserRootService } from './user-root.service.js';

describe('UserRootService', () => {
  const createService = () => {
    const journeysRepository = {
      findByUid: jest.fn(),
      findByUserId: jest.fn(),
    };
    const foldersRepository = {
      findByJourneyUid: jest.fn(),
      findByUid: jest.fn(),
      findByUserId: jest.fn(),
    };
    const tasksRepository = {
      findByParentUids: jest.fn(),
      findByUid: jest.fn(),
      findByUserId: jest.fn(),
    };

    return {
      foldersRepository,
      journeysRepository,
      service: new UserRootService(
        journeysRepository as never,
        foldersRepository as never,
        tasksRepository as never,
      ),
      tasksRepository,
    };
  };

  it.each([
    [[], [], [], 0],
    [[], [], [{ uid: 'task-1' }], 1],
    [[], [{ uid: 'folder-1' }], [{ uid: 'task-1' }], 2],
    [[{ uid: 'journey-1' }], [{ uid: 'folder-1' }], [{ uid: 'task-1' }], 3],
  ])(
    'counts non-empty collections as %i registers',
    async (journeys, folders, tasks, registers) => {
      const context = createService();
      context.journeysRepository.findByUserId.mockResolvedValue(journeys);
      context.foldersRepository.findByUserId.mockResolvedValue(folders);
      context.tasksRepository.findByUserId.mockResolvedValue(tasks);

      await expect(context.service.findByUserId('user-1')).resolves.toEqual({
        items: { folders, journeys, tasks },
        registers,
      });
      expect(context.journeysRepository.findByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(context.foldersRepository.findByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(context.tasksRepository.findByUserId).toHaveBeenCalledWith(
        'user-1',
      );
    },
  );

  it('returns a Journey with child Tasks grouped by Folder', async () => {
    const context = createService();
    const journey = { uid: 'journey-1', type: 'journey' };
    const folders = [
      { uid: 'folder-2', type: 'folder', orderIndex: 2 },
      { uid: 'folder-1', type: 'folder', orderIndex: 1 },
    ];
    const tasks = [
      { uid: 'task-direct', parent: { type: 'journey', uid: 'journey-1' } },
      { uid: 'task-folder', parent: { type: 'folder', uid: 'folder-1' } },
    ];
    context.journeysRepository.findByUid.mockResolvedValue(journey);
    context.foldersRepository.findByJourneyUid.mockResolvedValue(folders);
    context.tasksRepository.findByParentUids.mockResolvedValue(tasks);

    await expect(
      context.service.findResource({
        resourceId: 'journey-1',
        resourceType: 'journey',
      }),
    ).resolves.toEqual({
      items: {
        ...journey,
        folders: [
          { ...folders[1], tasks: [tasks[1]] },
          { ...folders[0], tasks: [] },
        ],
        tasks: [tasks[0]],
      },
    });
    expect(context.tasksRepository.findByParentUids).toHaveBeenCalledWith([
      { type: 'journey', uid: 'journey-1' },
      { type: 'folder', uid: 'folder-1' },
      { type: 'folder', uid: 'folder-2' },
    ]);
  });

  it('returns a Folder with direct Tasks and reuses Task lookup', async () => {
    const context = createService();
    const folder = { uid: 'folder-1', type: 'folder' };
    const task = { uid: 'task-1', type: 'task' };
    context.foldersRepository.findByUid.mockResolvedValue(folder);
    context.tasksRepository.findByParentUids.mockResolvedValue([task]);

    await expect(
      context.service.findResource({
        resourceId: 'folder-1',
        resourceType: 'folder',
      }),
    ).resolves.toEqual({ items: { ...folder, tasks: [task] } });

    context.tasksRepository.findByUid.mockResolvedValue(task);
    await expect(
      context.service.findResource({
        resourceId: 'task-1',
        resourceType: 'task',
      }),
    ).resolves.toEqual({ items: task });
    expect(context.tasksRepository.findByUid).toHaveBeenCalledWith('task-1');
  });
});
