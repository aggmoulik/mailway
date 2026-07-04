import { describe, it, expect } from 'vitest';
import {
  MailxError,
  AuthError,
  ValidationError,
  RateLimitError,
  ProviderError,
  NetworkError,
  TimeoutError,
  httpStatusToCategory,
  type MailxErrorCode,
} from '../src/errors';

describe('error taxonomy', () => {
  it('AuthError and ValidationError are non-retryable', () => {
    const a = new AuthError('bad key');
    expect(a).toBeInstanceOf(MailxError);
    expect(a).toBeInstanceOf(Error);
    expect(a.name).toBe('AuthError');
    expect(a.code).toBe('auth');
    expect(a.retryable).toBe(false);

    const v = new ValidationError('bad message');
    expect(v.code).toBe('validation');
    expect(v.retryable).toBe(false);
  });

  it('RateLimitError is retryable and carries retryAfter', () => {
    const e = new RateLimitError('slow down', { retryAfter: 12 });
    expect(e.code).toBe('rate_limit');
    expect(e.retryable).toBe(true);
    expect(e.retryAfter).toBe(12);
  });

  it('ProviderError carries statusCode/providerCode and configurable retryable', () => {
    const e = new ProviderError('boom', { statusCode: 502, providerCode: 'X1', retryable: true });
    expect(e.code).toBe('provider');
    expect(e.statusCode).toBe(502);
    expect(e.providerCode).toBe('X1');
    expect(e.retryable).toBe(true);
    expect(new ProviderError('boom').retryable).toBe(false); // default
  });

  it('NetworkError and TimeoutError are retryable', () => {
    expect(new NetworkError('net').retryable).toBe(true);
    expect(new NetworkError('net').code).toBe('network');
    expect(new TimeoutError('slow').retryable).toBe(true);
    expect(new TimeoutError('slow').code).toBe('timeout');
  });

  it('keeps raw provider payload on cause, never in message', () => {
    const raw = { error: { secret_token: 'sk_live_leaky', detail: 'nope' } };
    const e = new ProviderError('Provider request failed', { cause: raw, statusCode: 500, provider: 'acme' });
    expect(e.message).toBe('Provider request failed');
    expect(e.message).not.toContain('sk_live_leaky');
    expect(e.message).not.toContain('secret_token');
    expect(e.cause).toBe(raw);
    expect(e.provider).toBe('acme');
  });
});

describe('httpStatusToCategory', () => {
  it('maps HTTP statuses to error categories', () => {
    const cases: Array<[number, MailxErrorCode]> = [
      [401, 'auth'],
      [403, 'auth'],
      [400, 'validation'],
      [422, 'validation'],
      [404, 'validation'],
      [408, 'timeout'],
      [429, 'rate_limit'],
      [500, 'provider'],
      [502, 'provider'],
      [503, 'provider'],
    ];
    for (const [status, category] of cases) {
      expect(httpStatusToCategory(status)).toBe(category);
    }
  });
});
