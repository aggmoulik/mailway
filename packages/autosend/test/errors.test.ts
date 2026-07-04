import { describe, it, expect } from 'vitest';
import { AuthError, ProviderError, RateLimitError, ValidationError } from '@mailway/core';
import { mapAutosendError } from '../src/errors';

describe('mapAutosendError', () => {
  it('maps by status code', () => {
    expect(mapAutosendError({ message: 'x', statusCode: 401, provider: 'autosend', cause: {} })).toBeInstanceOf(AuthError);
    expect(mapAutosendError({ message: 'x', statusCode: 422, provider: 'autosend', cause: {} })).toBeInstanceOf(ValidationError);
    expect(mapAutosendError({ message: 'x', statusCode: 429, provider: 'autosend', cause: {} })).toBeInstanceOf(RateLimitError);
    const e = mapAutosendError({ message: 'x', statusCode: 500, provider: 'autosend', cause: {} });
    expect(e).toBeInstanceOf(ProviderError);
    expect(e.retryable).toBe(true);
  });

  it('defaults to a retryable ProviderError when status is unknown', () => {
    const e = mapAutosendError({ message: 'x', provider: 'autosend', cause: {} });
    expect(e).toBeInstanceOf(ProviderError);
    expect(e.retryable).toBe(true);
  });

  it('keeps the raw cause and provider', () => {
    const raw = { statusCode: 401, message: 'bad', secret: 'leak' };
    const e = mapAutosendError({ message: 'bad', statusCode: 401, provider: 'autosend', cause: raw });
    expect(e.message).toBe('bad');
    expect(e.message).not.toContain('leak');
    expect(e.cause).toBe(raw);
    expect(e.provider).toBe('autosend');
  });
});
