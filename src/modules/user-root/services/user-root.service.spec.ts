import { describe, expect, it, jest } from '@jest/globals';
import { UserRootService } from './user-root.service.js';

describe('UserRootService', () => {
  const createService = () => {
    const journeysRepository = {
      findByUid: jest.fn(),
      findByUserId: jest.fn(),
    };
    const foldersRepository = {
      findByParentUids: jest.fn().mockResolvedValue([]),
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
        items: {
          folders: folders.map((folder) => ({
            ...folder,
            progress: { completed: 0, discarded: 0, total: 0, percentage: 0 },
          })),
          journeys: journeys.map((journey) => ({
            ...journey,
            progress: { completed: 0, discarded: 0, total: 0, percentage: 0 },
          })),
          tasks,
        },
        registers,
      });
      expect(context.journeysRepository.findByUserId).toHaveBeenCalledWith(
        'user-1',
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
      context.service.findResource(
        {
          resourceId: 'journey-1',
          resourceType: 'journey',
        },
        'user-1',
      ),
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
    expect(context.tasksRepository.findByParentUids).toHaveBeenCalledWith(
      [
        { type: 'journey', uid: 'journey-1' },
        { type: 'folder', uid: 'folder-1' },
        { type: 'folder', uid: 'folder-2' },
      ],
      'user-1',
    );
  });

  it('calculates root progress across nested folders without duplicating tasks', async () => {
    const context = createService();
    const journey = { uid: 'journey-1', type: 'journey' };
    const rootFolder = {
      uid: 'folder-root',
      type: 'folder',
      parent: { type: 'user', uid: 'user-1' },
    };
    const nestedFolder = {
      uid: 'folder-nested',
      type: 'folder',
      parent: { type: 'folder', uid: 'folder-root' },
    };
    const journeyFolder = {
      uid: 'folder-journey',
      type: 'folder',
      parent: { type: 'journey', uid: 'journey-1' },
    };
    const tasks = [
      {
        uid: 'task-complete',
        parent: { type: 'journey', uid: 'journey-1' },
        state: 'completed',
        isVisible: true,
      },
      {
        uid: 'task-discarded',
        parent: { type: 'folder', uid: 'folder-nested' },
        state: 'discarded',
        isVisible: true,
      },
      {
        uid: 'task-pending',
        parent: { type: 'folder', uid: 'folder-journey' },
        state: 'pending',
        isVisible: true,
      },
    ];
    context.journeysRepository.findByUserId.mockResolvedValue([journey]);
    context.foldersRepository.findByUserId.mockResolvedValue([rootFolder]);
    context.tasksRepository.findByUserId.mockResolvedValue([]);
    context.foldersRepository.findByParentUids
      .mockResolvedValueOnce([nestedFolder, journeyFolder])
      .mockResolvedValueOnce([]);
    context.tasksRepository.findByParentUids.mockResolvedValue(tasks);

    await expect(context.service.findByUserId('user-1')).resolves.toMatchObject(
      {
        items: {
          journeys: [
            {
              progress: {
                completed: 1,
                discarded: 0,
                total: 2,
                percentage: 50,
              },
            },
          ],
          folders: [
            {
              progress: {
                completed: 0,
                discarded: 1,
                total: 1,
                percentage: 100,
              },
            },
          ],
        },
      },
    );
    expect(context.tasksRepository.findByParentUids).toHaveBeenCalledTimes(1);
  });

  it('returns a Folder with direct Tasks and reuses Task lookup', async () => {
    const context = createService();
    const folder = { uid: 'folder-1', type: 'folder' };
    const task = { uid: 'task-1', type: 'task' };
    context.foldersRepository.findByUid.mockResolvedValue(folder);
    context.tasksRepository.findByParentUids.mockResolvedValue([task]);

    await expect(
      context.service.findResource(
        {
          resourceId: 'folder-1',
          resourceType: 'folder',
        },
        'user-1',
      ),
    ).resolves.toEqual({ items: { ...folder, tasks: [task] } });

    context.tasksRepository.findByUid.mockResolvedValue(task);
    await expect(
      context.service.findResource(
        {
          resourceId: 'task-1',
          resourceType: 'task',
        },
        'user-1',
      ),
    ).resolves.toEqual({ items: task });
    expect(context.tasksRepository.findByUid).toHaveBeenCalledWith(
      'task-1',
      'user-1',
    );
  });

  it('floors percentage to a whole number', async () => {
    const context = createService();
    context.journeysRepository.findByUserId.mockResolvedValue([
      { uid: 'journey-1', type: 'journey' },
    ]);
    context.foldersRepository.findByUserId.mockResolvedValue([]);
    context.tasksRepository.findByUserId.mockResolvedValue([]);
    context.foldersRepository.findByParentUids.mockResolvedValue([]);
    context.tasksRepository.findByParentUids.mockResolvedValue([
      {
        uid: 'task-1',
        parent: { type: 'journey', uid: 'journey-1' },
        state: 'completed',
        isVisible: true,
      },
      {
        uid: 'task-2',
        parent: { type: 'journey', uid: 'journey-1' },
        state: 'completed',
        isVisible: true,
      },
      {
        uid: 'task-3',
        parent: { type: 'journey', uid: 'journey-1' },
        state: 'pending',
        isVisible: true,
      },
    ]);

    await expect(context.service.findByUserId('user-1')).resolves.toMatchObject(
      {
        items: { journeys: [{ progress: { percentage: 66 } }] },
      },
    );
  });
});
