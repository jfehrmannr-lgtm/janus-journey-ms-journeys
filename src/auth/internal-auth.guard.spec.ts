import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { InternalAuthGuard } from './internal-auth.guard.js';

const createGuard = (apiKey: unknown = 'journeys-key'): InternalAuthGuard =>
  new InternalAuthGuard({
    get: () => apiKey,
  } as never);

const contextFor = (headers: Record<string, string>, path = '/journeys') => ({
  switchToHttp: () => ({
    getRequest: () => ({ headers, path }),
  }),
});

describe('InternalAuthGuard', () => {
  it('allows a valid API key and user identity', () => {
    expect(
      createGuard().canActivate(
        contextFor({
          'x-api-key': 'journeys-key',
          'x-user-id': 'user-1',
        }) as never,
      ),
    ).toBe(true);
  });

  it.each([
    {},
    { 'x-user-id': 'user-1' },
    { 'x-api-key': 'invalid', 'x-user-id': 'user-1' },
    { 'x-api-key': 'journeys-key' },
    { 'x-api-key': 'journeys-key', 'x-user-id': '' },
    { 'x-api-key': 'journeys-key', 'x-user-id': '   ' },
  ])('rejects invalid internal authentication headers: %o', (headers) => {
    expect(() =>
      createGuard().canActivate(contextFor(headers) as never),
    ).toThrow(UnauthorizedException);
  });

  it('allows Swagger documentation without internal headers', () => {
    expect(createGuard().canActivate(contextFor({}, '/docs') as never)).toBe(
      true,
    );
    expect(
      createGuard().canActivate(contextFor({}, '/docs-json') as never),
    ).toBe(true);
    expect(
      createGuard().canActivate(
        contextFor({}, '/docs/swagger-ui.css') as never,
      ),
    ).toBe(true);
  });

  it('fails safely when the configured API key is missing', () => {
    expect(() => createGuard(null)).toThrow('MS_JOURNEYS_API_KEY is required');
    expect(() => createGuard('   ')).toThrow('MS_JOURNEYS_API_KEY is required');
  });
});
