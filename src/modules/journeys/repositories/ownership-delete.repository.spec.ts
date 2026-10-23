import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { FoldersRepository } from '../../folders/repositories/folders.repository.js';
import { TasksRepository } from '../../tasks/repositories/tasks.repository.js';
import { JourneysRepository } from './journeys.repository.js';

const query = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
});

const session = () => {
  const activeSession = {
    endSession: jest.fn(),
    withTransaction: jest.fn(),
  };
  activeSession.withTransaction.mockImplementation(
    async (callback: (transactionSession: unknown) => Promise<void>) =>
      callback(activeSession),
  );
  return activeSession;
};

describe('DELETE ownership repository behavior', () => {
  it('deletes an owned Task and scopes the database query', async () => {
    const taskModel = {
      deleteOne: jest.fn(() => query({ deletedCount: 1 })),
    };
    const repository = new TasksRepository(
      taskModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await repository.remove('task-1', 'user-a');

    expect(taskModel.deleteOne).toHaveBeenCalledWith({
      uid: 'task-1',
      ownerUid: 'user-a',
    });
  });

  it.each([['Task', TasksRepository]])(
    '%s rejects foreign and nonexistent individual resources',
    async (_name, Repository) => {
      const model = {
        deleteOne: jest.fn(() => query({ deletedCount: 0 })),
        findOne: jest.fn(() => query(null)),
      };
      const repository = new Repository(
        model as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await expect(
        repository.remove('resource-1', 'user-a'),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('rejects a foreign Folder before cascading deletion', async () => {
    const transaction = session();
    const folderModel = {
      findOne: jest.fn(() => query(null)),
      deleteOne: jest.fn(),
    };
    const repository = new FoldersRepository(
      folderModel as never,
      {} as never,
      {} as never,
      { startSession: jest.fn().mockResolvedValue(transaction) } as never,
    );

    await expect(
      repository.remove('folder-foreign', 'user-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(folderModel.deleteOne).not.toHaveBeenCalled();
  });

  it('cascades an owned Journey without deleting foreign descendants', async () => {
    const transaction = session();
    const journeyModel = {
      findOne: jest.fn(() => query({ _id: 'journey-db-id' })),
      deleteOne: jest.fn(() => query({ deletedCount: 1 })),
    };
    const folderModel = {
      find: jest.fn(() => query([{ uid: 'folder-1', ownerUid: 'user-a' }])),
      deleteMany: jest.fn(() => query({ deletedCount: 1 })),
    };
    const taskModel = {
      deleteMany: jest.fn(() => query({ deletedCount: 2 })),
    };
    const repository = new JourneysRepository(
      journeyModel as never,
      folderModel as never,
      taskModel as never,
      { startSession: jest.fn().mockResolvedValue(transaction) } as never,
    );

    await repository.remove('journey-1', 'user-a');

    expect(taskModel.deleteMany).toHaveBeenCalledWith({
      ownerUid: 'user-a',
      $or: expect.any(Array),
    });
    expect(folderModel.deleteMany).toHaveBeenCalledWith({
      'parent.uid': 'journey-1',
      'parent.type': 'journey',
      ownerUid: 'user-a',
    });
    expect(journeyModel.deleteOne).toHaveBeenCalledWith({
      uid: 'journey-1',
      ownerUid: 'user-a',
    });
  });

  it('rejects a bulk Folder delete containing a foreign resource atomically', async () => {
    const transaction = session();
    const folderModel = {
      find: jest.fn(() =>
        query([{ uid: 'folder-foreign', ownerUid: 'user-b' }]),
      ),
      deleteMany: jest.fn(),
    };
    const taskModel = { deleteMany: jest.fn() };
    const repository = new FoldersRepository(
      folderModel as never,
      taskModel as never,
      {} as never,
      { startSession: jest.fn().mockResolvedValue(transaction) } as never,
    );

    await expect(
      repository.deleteBulk(['folder-owned', 'folder-foreign'], 'user-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(taskModel.deleteMany).not.toHaveBeenCalled();
    expect(folderModel.deleteMany).not.toHaveBeenCalled();
  });

  it('ignores nonexistent IDs in bulk Task deletion', async () => {
    const transaction = session();
    const taskModel = {
      find: jest.fn(() => query([])),
      deleteMany: jest.fn(),
    };
    const repository = new TasksRepository(
      taskModel as never,
      {} as never,
      {} as never,
      { startSession: jest.fn().mockResolvedValue(transaction) } as never,
    );

    await repository.deleteBulk(['task-missing'], 'user-a');

    expect(taskModel.deleteMany).not.toHaveBeenCalled();
  });
});
