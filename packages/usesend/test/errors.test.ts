import { describe, it, expect } from 'vitest';
import { AuthError, ProviderError, RateLimitError, ValidationError } from '@mailway/core';
import { mapUsesendError } from '../src/errors';
import type { UsesendErrorResponse } from '../src/types';

const err = (message: string, code: string, extra: Record<string, unknown> = {}): UsesendErrorResponse =>
  ({ message, code, ...extra }) as UsesendErrorResponse;

describe('mapUsesendError', () => {
  it('maps by error code when no status code is present', () => {
    expect(mapUsesendError(err('no', 'UNAUTHORIZED'), 'usesend')).toBeInstanceOf(AuthError);
    expect(mapUsesendError(err('bad', 'VALIDATION_ERROR'), 'usesend')).toBeInstanceOf(ValidationError);
    expect(mapUsesendError(err('slow', 'RATE_LIMITED'), 'usesend')).toBeInstanceOf(RateLimitError);
    const e = mapUsesendError(err('boom', 'INTERNAL_ERROR'), 'usesend');
    expect(e).toBeInstanceOf(ProviderError);
    expect(e.retryable).toBe(true);
  });

  it('prefers a runtime status code', () => {
    expect(mapUsesendError(err('x', 'SOMETHING', { statusCode: 401 }), 'usesend')).toBeInstanceOf(AuthError);
  });

  it('keeps the raw error on cause, not in message', () => {
    const raw = err('Invalid field', 'VALIDATION_ERROR', { secret: 'leak' });
    const e = mapUsesendError(raw, 'usesend');
    expect(e.message).toBe('Invalid field');
    expect(e.message).not.toContain('leak');
    expect(e.cause).toBe(raw);
  });
});
