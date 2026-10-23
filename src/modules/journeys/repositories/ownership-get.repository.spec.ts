import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { JourneysRepository } from './journeys.repository.js';
import { FoldersRepository } from '../../folders/repositories/folders.repository.js';
import { TasksRepository } from '../../tasks/repositories/tasks.repository.js';

const query = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
  lean: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
});

const resource = {
  createdAt: new Date(),
  description: null,
  isVisible: true,
  metadata: {},
  name: 'Resource',
  orderIndex: 1,
  ownerUid: 'user-a',
  parent: { type: 'user', uid: 'user-a' },
  state: 'pending',
  taskType: null,
  type: 'journey',
  uid: 'journey-1',
  updatedAt: new Date(),
};

describe('GET ownership repository queries', () => {
  it.each([
    ['Journey', 'journey-1'],
    ['Folder', 'folder-1'],
    ['Task', 'task-1'],
  ])('%s individual retrieval scopes by ownerUid', async (_name, uid) => {
    const model = { findOne: jest.fn(() => query(resource)) };
    const repository = uid.startsWith('journey')
      ? new JourneysRepository(
          model as never,
          {} as never,
          {} as never,
          {} as never,
        )
      : uid.startsWith('folder')
        ? new FoldersRepository(
            model as never,
            {} as never,
            {} as never,
            {} as never,
          )
        : new TasksRepository(
            model as never,
            {} as never,
            {} as never,
            {} as never,
          );

    await repository.findByUid(uid, 'user-a');

    expect(model.findOne).toHaveBeenCalledWith({ uid, ownerUid: 'user-a' });
  });

  it.each([
    ['Journey', JourneysRepository],
    ['Folder', FoldersRepository],
    ['Task', TasksRepository],
  ])(
    '%s foreign and nonexistent resources return 404',
    async (_name, Repository) => {
      const model = { findOne: jest.fn(() => query(null)) };
      const repository = new Repository(
        model as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await expect(
        repository.findByUid('resource-1', 'user-a'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(model.findOne).toHaveBeenCalledWith({
        uid: 'resource-1',
        ownerUid: 'user-a',
      });
    },
  );

  it.each([
    ['Journey', JourneysRepository],
    ['Folder', FoldersRepository],
    ['Task', TasksRepository],
  ])(
    '%s collection and count queries scope by ownerUid',
    async (_name, Repository) => {
      const model = {
        countDocuments: jest.fn(() => query(1)),
        find: jest.fn(() => query([])),
      };
      const repository = new Repository(
        model as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await repository.findAll({ page: 1, size: 20 }, 'user-a');

      expect(model.find).toHaveBeenCalledWith({ ownerUid: 'user-a' });
      expect(model.countDocuments).toHaveBeenCalledWith({ ownerUid: 'user-a' });
    },
  );
});
