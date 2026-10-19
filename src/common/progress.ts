import type { Progress, Task } from '@journeys/types/journey.types.js';

/**
 * Calculates progress from visible Tasks using the shared Task state rules.
 *
 * @param tasks - Tasks to include in the calculation.
 * @returns The completed, discarded, total, and floored percentage values.
 */
export const calculateProgress = (tasks: Task[]): Progress => {
  const progress = tasks.reduce<Progress>(
    (result, task) => {
      if (!task.isVisible) return result;

      result.total += 1;
      if (task.state === 'completed') result.completed += 1;
      if (task.state === 'discarded') result.discarded += 1;
      return result;
    },
    { completed: 0, discarded: 0, total: 0, percentage: 0 },
  );

  progress.percentage =
    progress.total === 0
      ? 0
      : Math.floor(
          ((progress.completed + progress.discarded) / progress.total) * 100,
        );
  return progress;
};
