import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { ParentReferenceDto } from './parent-reference.dto.js';

describe('ParentReferenceDto', () => {
  it('requires both uid and type', async () => {
    const result = await validate(new ParentReferenceDto());
    const properties = result.map((error) => error.property);

    expect(properties).toEqual(expect.arrayContaining(['uid', 'type']));
  });
});
