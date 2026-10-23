import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { FoldersRepository } from '../../folders/repositories/folders.repository.js';
import { TasksRepository } from '../../tasks/repositories/tasks.repository.js';
import { JourneysRepository } from './journeys.repository.js';

const query = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
});

const createdDocument = (type: 'journey' | 'folder' | 'task') => ({
  description: null,
  isVisible: true,
  metadata: {},
  name: 'Resource',
  orderIndex: 0,
  ownerUid: 'user-a',
  parent: { type: 'user', uid: 'user-a' },
  state: 'pending',
  taskType: null,
  type,
  uid: `${type}-created`,
});

describe('POST ownership repository behavior', () => {
  it('assigns the authenticated owner to an individual Journey', async () => {
    const journeyModel = {
      create: jest.fn().mockResolvedValue(createdDocument('journey')),
    };
    const repository = new JourneysRepository(
      journeyModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await repository.create(
      { name: 'Journey', parent: { type: 'user', uid: 'user-a' } },
      'user-a',
    );

    expect(journeyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUid: 'user-a' }),
    );
    expect(result.ownerUid).toBe('user-a');
  });

  it('assigns the authenticated owner to individual Folder and Task resources', async () => {
    const folderModel = {
      create: jest.fn().mockResolvedValue(createdDocument('folder')),
    };
    const taskModel = {
      create: jest.fn().mockResolvedValue(createdDocument('task')),
    };
    const folderRepository = new FoldersRepository(
      folderModel as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const taskRepository = new TasksRepository(
      taskModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const [folder, task] = await Promise.all([
      folderRepository.create(
        { name: 'Folder', parent: { type: 'user', uid: 'user-a' } },
        'user-a',
      ),
      taskRepository.create(
        {
          isVisible: true,
          name: 'Task',
          parent: { type: 'user', uid: 'user-a' },
          state: 'pending',
        },
        'user-a',
      ),
    ]);

    expect(folder.ownerUid).toBe('user-a');
    expect(task.ownerUid).toBe('user-a');
    expect(folderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUid: 'user-a' }),
    );
    expect(taskModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUid: 'user-a' }),
    );
  });

  it.each([
    [
      'Journey',
      async () => {
        const repository = new JourneysRepository(
          { create: jest.fn() } as never,
          {} as never,
          {} as never,
          {} as never,
        );
        return repository.create(
          { name: 'Journey', parent: { type: 'user', uid: 'user-b' } },
          'user-a',
        );
      },
    ],
    [
      'Folder',
      async () => {
        const repository = new FoldersRepository(
          { create: jest.fn() } as never,
          {} as never,
          {} as never,
          {} as never,
        );
        return repository.create(
          { name: 'Folder', parent: { type: 'user', uid: 'user-b' } },
          'user-a',
        );
      },
    ],
    [
      'Task',
      async () => {
        const repository = new TasksRepository(
          { create: jest.fn() } as never,
          {} as never,
          {} as never,
          {} as never,
        );
        return repository.create(
          {
            isVisible: true,
            name: 'Task',
            parent: { type: 'user', uid: 'user-b' },
            state: 'pending',
          },
          'user-a',
        );
      },
    ],
  ])('%s rejects a foreign User parent with 404', async (_name, create) => {
    await expect(create()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects foreign Journey and Folder parents during individual creation', async () => {
    const journeyModel = { findOne: jest.fn(() => query(null)) };
    const folderModel = { findOne: jest.fn(() => query(null)) };
    const folderRepository = new FoldersRepository(
      { create: jest.fn() } as never,
      {} as never,
      journeyModel as never,
      {} as never,
    );
    const taskRepository = new TasksRepository(
      { create: jest.fn() } as never,
      journeyModel as never,
      folderModel as never,
      {} as never,
    );

    await expect(
      folderRepository.create(
        { name: 'Folder', parent: { type: 'journey', uid: 'journey-b' } },
        'user-a',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      taskRepository.create(
        {
          isVisible: true,
          name: 'Task',
          parent: { type: 'folder', uid: 'folder-b' },
          state: 'pending',
        },
        'user-a',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects foreign parents before bulk Folder and Task insertion', async () => {
    const folderModel = {
      find: jest.fn(() => query([])),
      insertMany: jest.fn(),
    };
    const taskModel = {
      find: jest.fn(() => query([])),
      insertMany: jest.fn(),
    };
    const folderRepository = new FoldersRepository(
      folderModel as never,
      {} as never,
      folderModel as never,
      {} as never,
    );
    const taskRepository = new TasksRepository(
      taskModel as never,
      taskModel as never,
      taskModel as never,
      {} as never,
    );

    await expect(
      folderRepository.bulkCreate(
        [{ name: 'Folder', parent: { type: 'journey', uid: 'journey-b' } }],
        'user-a',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      taskRepository.bulkCreate(
        [
          {
            isVisible: true,
            name: 'Task',
            parent: { type: 'folder', uid: 'folder-b' },
            state: 'pending',
          },
        ],
        'user-a',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(folderModel.insertMany).not.toHaveBeenCalled();
    expect(taskModel.insertMany).not.toHaveBeenCalled();
  });
});
