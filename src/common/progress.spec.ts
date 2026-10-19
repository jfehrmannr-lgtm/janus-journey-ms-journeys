import { describe, expect, it } from '@jest/globals';
import { calculateProgress } from './progress.js';

describe('calculateProgress', () => {
  it('counts visible completed and discarded Tasks', () => {
    const tasks = [
      { state: 'completed', isVisible: true },
      { state: 'discarded', isVisible: true },
      { state: 'pending', isVisible: true },
      { state: 'completed', isVisible: false },
    ];

    expect(calculateProgress(tasks as never)).toEqual({
      completed: 1,
      discarded: 1,
      total: 3,
      percentage: 66,
    });
  });

  it('returns zero progress without Tasks', () => {
    expect(calculateProgress([])).toEqual({
      completed: 0,
      discarded: 0,
      total: 0,
      percentage: 0,
    });
  });
});
