import { describe, expect, it, jest } from '@jest/globals';
import { FoldersRepository } from './folders.repository.js';

const query = <T>(result: T, error?: Error) => ({
  exec: error
    ? jest.fn().mockRejectedValue(error)
    : jest.fn().mockResolvedValue(result),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
});

describe('FoldersRepository deletion', () => {
  it('does not delete the Folder when child deletion fails', async () => {
    const session = {
      endSession: jest.fn(),
      withTransaction: jest.fn(),
    };
    session.withTransaction.mockImplementation(
      async (callback: (activeSession: unknown) => Promise<void>) =>
        callback(session),
    );

    const folderModel = {
      deleteOne: jest.fn(),
      findOne: jest.fn(() => query({ _id: 'folder-id' })),
    };
    const taskModel = {
      deleteMany: jest.fn(() => query(undefined, new Error('delete failed'))),
    };
    const connection = {
      startSession: jest.fn().mockResolvedValue(session),
    };
    const repository = new FoldersRepository(
      folderModel as never,
      taskModel as never,
      {} as never,
      connection as never,
    );

    await expect(repository.remove('folder-id')).rejects.toThrow(
      'delete failed',
    );
    expect(folderModel.deleteOne).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });
});

describe('FoldersRepository bulk creation', () => {
  it('supports User parents and correlates inserted resources by clientId', async () => {
    const createdDocuments = [
      {
        createdAt: new Date(),
        description: null,
        metadata: {},
        name: 'Folder',
        orderIndex: 0,
        parent: { type: 'user', uid: 'user-1' },
        type: 'folder',
        uid: 'folder-generated',
        updatedAt: new Date(),
      },
    ];
    const folderModel = {
      insertMany: jest.fn((documents: Array<{ uid: string }>) =>
        documents.map((document) => ({
          ...createdDocuments[0],
          uid: document.uid,
        })),
      ),
    };
    const journeyModel = { find: jest.fn() };
    const repository = new FoldersRepository(
      folderModel as never,
      {} as never,
      journeyModel as never,
      {} as never,
    );

    const result = await repository.bulkCreate([
      {
        clientId: 'folder-client-1',
        name: 'Folder',
        parent: { type: 'user', uid: 'user-1' },
      },
    ]);

    expect(folderModel.insertMany).toHaveBeenCalledTimes(1);
    expect(folderModel.insertMany.mock.calls[0][0][0]).not.toHaveProperty(
      'clientId',
    );
    expect(result[0]).toMatchObject({
      clientId: 'folder-client-1',
      resource: { type: 'folder' },
    });
    expect(result[0].resource.uid).toMatch(/^folder-/);
  });

  it('allows Journey parents when the Journey exists', async () => {
    const folderModel = {
      insertMany: jest.fn((documents: Array<{ uid: string }>) => documents),
    };
    const journeyModel = {
      find: jest.fn(() => query([{ uid: 'journey-1' }])),
    };
    const repository = new FoldersRepository(
      folderModel as never,
      {} as never,
      journeyModel as never,
      {} as never,
    );

    await expect(
      repository.bulkCreate([
        {
          clientId: 'folder-client-journey',
          name: 'Journey Folder',
          parent: { type: 'journey', uid: 'journey-1' },
        },
      ]),
    ).resolves.toHaveLength(1);
  });

  it('rejects Folder parents before insertion', async () => {
    const folderModel = { insertMany: jest.fn() };
    const repository = new FoldersRepository(
      folderModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      repository.bulkCreate([
        {
          clientId: 'folder-client-1',
          name: 'Folder',
          parent: { type: 'folder', uid: 'folder-1' },
        },
      ]),
    ).rejects.toThrow('Folder parent must be a User or Journey');
    expect(folderModel.insertMany).not.toHaveBeenCalled();
  });

  it('omits clientId from the result when it was not supplied', async () => {
    const folderModel = {
      insertMany: jest.fn((documents: Array<{ uid: string }>) => documents),
    };
    const repository = new FoldersRepository(
      folderModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const [result] = await repository.bulkCreate([
      {
        name: 'Uncorrelated Folder',
        parent: { type: 'user', uid: 'user-1' },
      },
    ]);

    expect(result).not.toHaveProperty('clientId');
    expect(folderModel.insertMany.mock.calls[0][0][0]).not.toHaveProperty(
      'clientId',
    );
  });
});

describe('FoldersRepository bulk deletion', () => {
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

  it('deletes Folders and their Tasks in one transaction', async () => {
    const session = createSession();
    const folderModel = {
      find: jest.fn(() => query([{ uid: 'folder-1' }])),
      deleteMany: jest.fn(() => query({ deletedCount: 1 })),
    };
    const taskModel = {
      deleteMany: jest.fn(() => query({ deletedCount: 2 })),
    };
    const repository = new FoldersRepository(
      folderModel as never,
      taskModel as never,
      {} as never,
      { startSession: jest.fn().mockResolvedValue(session) } as never,
    );

    await repository.deleteBulk(['folder-1', 'folder-missing']);

    expect(taskModel.deleteMany).toHaveBeenCalledWith({
      'parent.type': 'folder',
      'parent.uid': { $in: ['folder-1'] },
    });
    expect(folderModel.deleteMany).toHaveBeenCalledWith({
      type: 'folder',
      uid: { $in: ['folder-1'] },
    });
    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('does nothing when all Folder UIDs are missing', async () => {
    const session = createSession();
    const folderModel = {
      find: jest.fn(() => query([])),
      deleteMany: jest.fn(),
    };
    const taskModel = { deleteMany: jest.fn() };
    const repository = new FoldersRepository(
      folderModel as never,
      taskModel as never,
      {} as never,
      { startSession: jest.fn().mockResolvedValue(session) } as never,
    );

    await repository.deleteBulk(['folder-missing']);

    expect(taskModel.deleteMany).not.toHaveBeenCalled();
    expect(folderModel.deleteMany).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('does not delete Folders when child deletion fails', async () => {
    const session = createSession();
    const folderModel = {
      find: jest.fn(() => query([{ uid: 'folder-1' }])),
      deleteMany: jest.fn(),
    };
    const taskModel = {
      deleteMany: jest.fn(() => query(undefined, new Error('delete failed'))),
    };
    const repository = new FoldersRepository(
      folderModel as never,
      taskModel as never,
      {} as never,
      { startSession: jest.fn().mockResolvedValue(session) } as never,
    );

    await expect(repository.deleteBulk(['folder-1'])).rejects.toThrow(
      'delete failed',
    );
    expect(folderModel.deleteMany).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});
