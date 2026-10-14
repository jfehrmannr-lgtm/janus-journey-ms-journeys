import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { CreateJourneyDto } from './create-journey.dto.js';

describe('CreateJourneyDto', () => {
  it('requires parent', async () => {
    const result = await validate(new CreateJourneyDto());

    expect(result.map((error) => error.property)).toContain('parent');
  });
});
