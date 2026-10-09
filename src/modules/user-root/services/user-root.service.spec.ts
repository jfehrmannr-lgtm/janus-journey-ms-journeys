import { describe, expect, it, jest } from '@jest/globals';
import { UserRootService } from './user-root.service.js';

describe('UserRootService', () => {
  const createService = () => {
    const journeysRepository = { findByUserId: jest.fn() };
    const foldersRepository = { findByUserId: jest.fn() };
    const tasksRepository = { findByUserId: jest.fn() };

    return {
      foldersRepository,
      journeysRepository,
      service: new UserRootService(
        journeysRepository as never,
        foldersRepository as never,
        tasksRepository as never,
      ),
      tasksRepository,
    };
  };

  it.each([
    [[], [], [], 0],
    [[], [], [{ uid: 'task-1' }], 1],
    [[], [{ uid: 'folder-1' }], [{ uid: 'task-1' }], 2],
    [[{ uid: 'journey-1' }], [{ uid: 'folder-1' }], [{ uid: 'task-1' }], 3],
  ])(
    'counts non-empty collections as %i registers',
    async (journeys, folders, tasks, registers) => {
      const context = createService();
      context.journeysRepository.findByUserId.mockResolvedValue(journeys);
      context.foldersRepository.findByUserId.mockResolvedValue(folders);
      context.tasksRepository.findByUserId.mockResolvedValue(tasks);

      await expect(context.service.findByUserId('user-1')).resolves.toEqual({
        items: { folders, journeys, tasks },
        registers,
      });
      expect(context.journeysRepository.findByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(context.foldersRepository.findByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(context.tasksRepository.findByUserId).toHaveBeenCalledWith(
        'user-1',
      );
    },
  );
});
