import { describe, expect, it, jest } from '@jest/globals';
import { JourneysRepository } from './journeys.repository.js';

const query = <T>(result: T, error?: Error) => ({
  exec: error
    ? jest.fn().mockRejectedValue(error)
    : jest.fn().mockResolvedValue(result),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
});

describe('JourneysRepository deletion', () => {
  it('does not continue deletion when a child deletion fails', async () => {
    const session = {
      endSession: jest.fn(),
      withTransaction: jest.fn(),
    };
    session.withTransaction.mockImplementation(
      async (callback: (activeSession: unknown) => Promise<void>) =>
        callback(session),
    );

    const journeyModel = {
      deleteOne: jest.fn(),
      findOne: jest.fn(() => query({ _id: 'journey-id' })),
    };
    const folderModel = {
      deleteMany: jest.fn(),
      find: jest.fn(() => query([{ uid: 'folder-id' }])),
    };
    const taskModel = {
      deleteMany: jest.fn(() => query(undefined, new Error('delete failed'))),
    };
    const connection = {
      startSession: jest.fn().mockResolvedValue(session),
    };
    const repository = new JourneysRepository(
      journeyModel as never,
      folderModel as never,
      taskModel as never,
      connection as never,
    );

    await expect(repository.remove('journey-id')).rejects.toThrow(
      'delete failed',
    );
    expect(folderModel.deleteMany).not.toHaveBeenCalled();
    expect(journeyModel.deleteOne).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });
});
