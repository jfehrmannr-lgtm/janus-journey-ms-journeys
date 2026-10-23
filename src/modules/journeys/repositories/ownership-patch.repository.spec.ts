import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FoldersRepository } from '../../folders/repositories/folders.repository.js';
import { TasksRepository } from '../../tasks/repositories/tasks.repository.js';
import { JourneysRepository } from './journeys.repository.js';

const query = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
});

const resource = (type: 'journey' | 'folder' | 'task') => ({
  description: null,
  isVisible: true,
  metadata: {},
  name: 'Resource',
  orderIndex: 0,
  ownerUid: 'user-a',
  parent: { type: 'user', uid: 'user-a' },
  state: 'pending',
  type,
  uid: `${type}-1`,
});

describe('PATCH ownership repository behavior', () => {
  it('updates an owned Journey with an owner-scoped database filter', async () => {
    const journeyModel = {
      findOne: jest.fn(() => query(resource('journey'))),
      findOneAndUpdate: jest.fn(() => query(resource('journey'))),
    };
    const repository = new JourneysRepository(
      journeyModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await repository.update('journey-1', { name: 'Updated' }, 'user-a');

    expect(journeyModel.findOne).toHaveBeenCalledWith({
      uid: 'journey-1',
      ownerUid: 'user-a',
    });
    expect(journeyModel.findOneAndUpdate).toHaveBeenCalledWith(
      { uid: 'journey-1', ownerUid: 'user-a' },
      { $set: { name: 'Updated' } },
      expect.objectContaining({ runValidators: true }),
    );
  });

  it.each([
    ['Journey', JourneysRepository],
    ['Folder', FoldersRepository],
    ['Task', TasksRepository],
  ])('%s rejects a foreign resource with 404', async (_name, Repository) => {
    const model = { findOne: jest.fn(() => query(null)) };
    const repository = new Repository(
      model as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      repository.update('resource-1', { name: 'Updated' }, 'user-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(model.findOne).toHaveBeenCalledWith({
      uid: 'resource-1',
      ownerUid: 'user-a',
    });
  });

  it('validates an owned parent when moving a Folder', async () => {
    const journeyModel = {
      findOne: jest.fn(() => query({ uid: 'journey-2' })),
    };
    const folderModel = {
      findOne: jest
        .fn()
        .mockImplementationOnce(() => query(resource('folder'))),
      findOneAndUpdate: jest.fn(() => query(resource('folder'))),
    };
    const repository = new FoldersRepository(
      folderModel as never,
      {} as never,
      journeyModel as never,
      {} as never,
    );

    await repository.update(
      'folder-1',
      { parent: { type: 'journey', uid: 'journey-2' } },
      'user-a',
    );

    expect(journeyModel.findOne).toHaveBeenCalledWith({
      uid: 'journey-2',
      type: 'journey',
      ownerUid: 'user-a',
    });
    expect(folderModel.findOneAndUpdate).toHaveBeenCalledWith(
      { uid: 'folder-1', ownerUid: 'user-a' },
      { $set: { parent: { type: 'journey', uid: 'journey-2' } } },
      expect.objectContaining({ runValidators: true }),
    );
  });

  it('rejects a foreign parent when moving a Task', async () => {
    const taskModel = {
      findOne: jest.fn().mockImplementationOnce(() => query(resource('task'))),
    };
    const folderModel = {
      findOne: jest.fn(() => query(null)),
    };
    const repository = new TasksRepository(
      taskModel as never,
      {} as never,
      folderModel as never,
      {} as never,
    );

    await expect(
      repository.update(
        'task-1',
        { parent: { type: 'folder', uid: 'folder-b' } },
        'user-a',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(folderModel.findOne).toHaveBeenCalledWith({
      uid: 'folder-b',
      type: 'folder',
      ownerUid: 'user-a',
    });
  });

  it('does not include ownerUid in a database update', async () => {
    const journeyModel = {
      findOne: jest.fn(() => query(resource('journey'))),
      findOneAndUpdate: jest.fn(() => query(resource('journey'))),
    };
    const repository = new JourneysRepository(
      journeyModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await repository.update(
      'journey-1',
      { ownerUid: 'user-b' } as never,
      'user-a',
    );

    expect(journeyModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('preserves invalid parent hierarchy rejection', async () => {
    const folderModel = {
      findOne: jest.fn(() => query(resource('folder'))),
    };
    const repository = new FoldersRepository(
      folderModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      repository.update(
        'folder-1',
        { parent: { type: 'folder', uid: 'folder-2' } },
        'user-a',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
