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
