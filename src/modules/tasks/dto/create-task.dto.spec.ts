import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { CreateTaskDto } from './create-task.dto.js';

describe('CreateTaskDto', () => {
  it('requires parent', async () => {
    const result = await validate(new CreateTaskDto());

    expect(result.map((error) => error.property)).toContain('parent');
  });
});
