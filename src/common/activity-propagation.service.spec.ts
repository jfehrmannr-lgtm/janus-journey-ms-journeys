import { describe, expect, it, jest } from '@jest/globals';
import { ActivityPropagationService } from './activity-propagation.service.js';

const query = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
});

describe('ActivityPropagationService', () => {
  it('resolves nested ancestors and updates each one monotonically', async () => {
    const journeyModel = {
      findOne: jest.fn(() =>
        query({ parent: { type: 'user', uid: 'user-1' } }),
      ),
      findOneAndUpdate: jest.fn(() => query({ _id: 'journey-db-id' })),
    };
    const folderModel = {
      findOne: jest
        .fn()
        .mockImplementationOnce(() =>
          query({ parent: { type: 'folder', uid: 'folder-a' } }),
        )
        .mockImplementationOnce(() =>
          query({ parent: { type: 'journey', uid: 'journey-1' } }),
        ),
      findOneAndUpdate: jest.fn(() => query({ _id: 'folder-db-id' })),
    };
    const service = new ActivityPropagationService(
      journeyModel as never,
      folderModel as never,
    );
    const activityAt = new Date();

    const ancestors = await service.resolveAncestors(
      { type: 'folder', uid: 'folder-b' },
      'user-1',
    );
    await service.propagate(ancestors, 'user-1', activityAt);

    expect(ancestors).toEqual([
      { type: 'folder', uid: 'folder-b' },
      { type: 'folder', uid: 'folder-a' },
      { type: 'journey', uid: 'journey-1' },
    ]);
    expect(folderModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(journeyModel.findOneAndUpdate).toHaveBeenCalledWith(
      { ownerUid: 'user-1', type: 'journey', uid: 'journey-1' },
      { $max: { lastActivityAt: activityAt } },
      { returnDocument: 'after', timestamps: false },
    );
  });
});
