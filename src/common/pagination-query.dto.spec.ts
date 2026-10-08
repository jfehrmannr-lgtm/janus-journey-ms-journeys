import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from '@jest/globals';
import { PaginationQueryDto } from './pagination-query.dto.js';

describe('PaginationQueryDto', () => {
  it('normalizes oversized integer sizes to 200', () => {
    expect(
      plainToInstance(PaginationQueryDto, { page: '1', size: '201' }).size,
    ).toBe(200);
    expect(
      plainToInstance(PaginationQueryDto, { page: '1', size: '1000' }).size,
    ).toBe(200);
  });

  it('preserves valid sizes within the maximum', () => {
    expect(
      plainToInstance(PaginationQueryDto, { page: '1', size: '20' }).size,
    ).toBe(20);
    expect(
      plainToInstance(PaginationQueryDto, { page: '1', size: '200' }).size,
    ).toBe(200);
  });
});
