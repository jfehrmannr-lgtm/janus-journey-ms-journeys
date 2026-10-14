import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { CreateFolderDto } from './create-folder.dto.js';

describe('CreateFolderDto', () => {
  it('requires parent', async () => {
    const result = await validate(new CreateFolderDto());

    expect(result.map((error) => error.property)).toContain('parent');
  });
});
