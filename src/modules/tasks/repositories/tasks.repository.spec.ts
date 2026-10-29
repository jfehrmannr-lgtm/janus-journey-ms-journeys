import { describe, expect, it, jest } from '@jest/globals';
import { TasksRepository } from './tasks.repository.js';

const query = <T>(result: T, error?: Error) => ({
  exec: error
    ? jest.fn().mockRejectedValue(error)
    : jest.fn().mockResolvedValue(result),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
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
      {} as never,
    );

    const result = await repository.bulkCreate(
      [
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
      ],
      'user-1',
    );

    expect(taskModel.insertMany).toHaveBeenCalledTimes(1);
    expect(taskModel.insertMany.mock.calls[0][0]).toHaveLength(2);
    expect(taskModel.insertMany.mock.calls[0][0][0]).not.toHaveProperty(
      'clientId',
    );
    expect(taskModel.insertMany.mock.calls[0][0][0]).toMatchObject({
      ownerUid: 'user-1',
    });
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
      {} as never,
    );

    const [result] = await repository.bulkCreate(
      [
        {
          clientId: 'task-client-user',
          isVisible: true,
          name: 'User Task',
          parent: { type: 'user', uid: 'user-1' },
          state: 'pending',
        },
      ],
      'user-1',
    );

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
      {} as never,
    );

    const [result] = await repository.bulkCreate(
      [
        {
          isVisible: true,
          name: 'Uncorrelated Task',
          parent: { type: 'journey', uid: 'journey-1' },
          state: 'pending',
        },
      ],
      'user-1',
    );

    expect(result).not.toHaveProperty('clientId');
    expect(taskModel.insertMany.mock.calls[0][0][0]).not.toHaveProperty(
      'clientId',
    );
  });
});

describe('TasksRepository bulk deletion', () => {
  const createSession = () => {
    const session = {
      endSession: jest.fn(),
      withTransaction: jest.fn(),
    };
    session.withTransaction.mockImplementation(
      async (callback: (activeSession: unknown) => Promise<void>) =>
        callback(session),
    );
    return session;
  };

  it('deletes existing Tasks in one transaction and ignores missing UIDs', async () => {
    const session = createSession();
    const taskModel = {
      find: jest.fn(() => query([{ uid: 'task-1', ownerUid: 'user-1' }])),
      deleteMany: jest.fn(() => query({ deletedCount: 1 })),
    };
    const repository = new TasksRepository(
      taskModel as never,
      {} as never,
      {} as never,
      { startSession: jest.fn().mockResolvedValue(session) } as never,
    );

    await repository.deleteBulk(['task-1', 'task-missing'], 'user-1');

    expect(taskModel.deleteMany).toHaveBeenCalledWith({
      type: 'task',
      uid: { $in: ['task-1'] },
      ownerUid: 'user-1',
    });
    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('resolves each shared Task parent hierarchy once', async () => {
    const session = createSession();
    const parent = { type: 'folder' as const, uid: 'folder-1' };
    const taskModel = {
      find: jest.fn(() =>
        query([
          { ownerUid: 'user-1', parent, uid: 'task-1' },
          { ownerUid: 'user-1', parent, uid: 'task-2' },
        ]),
      ),
      deleteMany: jest.fn(() => query({ deletedCount: 2 })),
    };
    const activityPropagation = {
      propagate: jest.fn(),
      resolveAncestors: jest
        .fn()
        .mockResolvedValue([{ type: 'folder', uid: 'folder-1' }]),
    };
    const repository = new TasksRepository(
      taskModel as never,
      {} as never,
      {} as never,
      { startSession: jest.fn().mockResolvedValue(session) } as never,
      activityPropagation as never,
    );

    await repository.deleteBulk(['task-1', 'task-2'], 'user-1');

    expect(activityPropagation.resolveAncestors).toHaveBeenCalledTimes(1);
    expect(activityPropagation.resolveAncestors).toHaveBeenCalledWith(
      parent,
      'user-1',
      session,
    );
    expect(activityPropagation.propagate).toHaveBeenCalledWith(
      [{ type: 'folder', uid: 'folder-1' }],
      'user-1',
      expect.any(Date),
      session,
    );
  });

  it('propagates deletion failures so the transaction can roll back', async () => {
    const session = createSession();
    const failure = new Error('delete failed');
    const taskModel = {
      find: jest.fn(() => query([{ uid: 'task-1', ownerUid: 'user-1' }])),
      deleteMany: jest.fn(() => query(undefined, failure)),
    };
    const repository = new TasksRepository(
      taskModel as never,
      {} as never,
      {} as never,
      { startSession: jest.fn().mockResolvedValue(session) } as never,
    );

    await expect(repository.deleteBulk(['task-1'], 'user-1')).rejects.toThrow(
      'delete failed',
    );
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});
