import { describe, expect, it, jest } from '@jest/globals';
import { TasksRepository } from './tasks.repository.js';

const query = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
});

describe('TasksRepository bulk creation', () => {
  it('supports mixed Journey and Folder parents without relying on insert order', async () => {
    const taskModel = {
      insertMany: jest.fn((documents: Array<{ uid: string }>) =>
        [...documents].reverse(),
      ),
    };
    const journeyModel = {
      find: jest.fn(() => query([{ uid: 'journey-1' }])),
    };
    const folderModel = {
      find: jest.fn(() => query([{ uid: 'folder-1' }])),
    };
    const repository = new TasksRepository(
      taskModel as never,
      journeyModel as never,
      folderModel as never,
    );

    const result = await repository.bulkCreate([
      {
        clientId: 'task-client-journey',
        isVisible: true,
        name: 'Journey Task',
        parent: { type: 'journey', uid: 'journey-1' },
        state: 'pending',
      },
      {
        clientId: 'task-client-folder',
        isVisible: false,
        name: 'Folder Task',
        parent: { type: 'folder', uid: 'folder-1' },
        state: 'in-progress',
      },
    ]);

    expect(taskModel.insertMany).toHaveBeenCalledTimes(1);
    expect(taskModel.insertMany.mock.calls[0][0]).toHaveLength(2);
    expect(taskModel.insertMany.mock.calls[0][0][0]).not.toHaveProperty(
      'clientId',
    );
    expect(result.map((item) => item.clientId)).toEqual([
      'task-client-journey',
      'task-client-folder',
    ]);
    expect(result[0].resource.parent).toEqual({
      type: 'journey',
      uid: 'journey-1',
    });
    expect(result[1].resource.parent).toEqual({
      type: 'folder',
      uid: 'folder-1',
    });
  });

  it('rejects unsupported parent types before insertion', async () => {
    const taskModel = { insertMany: jest.fn() };
    const repository = new TasksRepository(
      taskModel as never,
      {} as never,
      {} as never,
    );

    await expect(
      repository.bulkCreate([
        {
          clientId: 'task-client-1',
          isVisible: true,
          name: 'Task',
          parent: { type: 'task' as never, uid: 'task-1' },
          state: 'pending',
        },
      ]),
    ).rejects.toThrow(
      'Bulk Task items must use Journey, Folder, or User parents',
    );
    expect(taskModel.insertMany).not.toHaveBeenCalled();
  });

  it('supports User parents without requiring a User lookup', async () => {
    const taskModel = {
      insertMany: jest.fn((documents: Array<{ uid: string }>) => documents),
    };
    const repository = new TasksRepository(
      taskModel as never,
      {} as never,
      {} as never,
    );

    const [result] = await repository.bulkCreate([
      {
        clientId: 'task-client-user',
        isVisible: true,
        name: 'User Task',
        parent: { type: 'user', uid: 'user-1' },
        state: 'pending',
      },
    ]);

    expect(result.resource.parent).toEqual({ type: 'user', uid: 'user-1' });
    expect(taskModel.insertMany).toHaveBeenCalledTimes(1);
  });

  it('omits clientId from the result when it was not supplied', async () => {
    const taskModel = {
      insertMany: jest.fn((documents: Array<{ uid: string }>) => documents),
    };
    const journeyModel = {
      find: jest.fn(() => query([{ uid: 'journey-1' }])),
    };
    const repository = new TasksRepository(
      taskModel as never,
      journeyModel as never,
      {} as never,
    );

    const [result] = await repository.bulkCreate([
      {
        isVisible: true,
        name: 'Uncorrelated Task',
        parent: { type: 'journey', uid: 'journey-1' },
        state: 'pending',
      },
    ]);

    expect(result).not.toHaveProperty('clientId');
    expect(taskModel.insertMany.mock.calls[0][0][0]).not.toHaveProperty(
      'clientId',
    );
  });
});
