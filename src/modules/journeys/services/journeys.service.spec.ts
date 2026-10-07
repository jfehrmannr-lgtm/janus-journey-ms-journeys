import { describe, expect, it, jest } from '@jest/globals';
import { JourneysService } from './journeys.service.js';

describe('JourneysService', () => {
  it('delegates Journey operations to persistence', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn().mockResolvedValue({ items: [], totalRecords: 0 }),
      findByUid: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const service = new JourneysService(repository);
    const input = { name: 'Journey', parentUid: 'user-1' };

    await service.create(input);
    await service.findAll({ page: 1, size: 20 });
    await service.findByUid('journey-1');
    await service.update('journey-1', { name: 'Updated' });
    await service.remove('journey-1');

    expect(repository.create).toHaveBeenCalledWith(input);
    expect(repository.findAll).toHaveBeenCalledWith({ page: 1, size: 20 });
    expect(repository.findByUid).toHaveBeenCalledWith('journey-1');
    expect(repository.update).toHaveBeenCalledWith('journey-1', {
      name: 'Updated',
    });
    expect(repository.remove).toHaveBeenCalledWith('journey-1');
  });
});
