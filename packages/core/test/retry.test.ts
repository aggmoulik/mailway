import { describe, it, expect, vi, afterEach } from 'vitest';
import { withRetry } from '../src/retry';
import { NetworkError, AuthError, RateLimitError } from '../src/errors';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('withRetry', () => {
  it('retries retryable failures then succeeds', async () => {
    vi.useFakeTimers();
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      if (n < 3) throw new NetworkError('net');
      return 'ok';
    });
    const p = withRetry(fn, { retries: 3, jitter: 'none', baseDelayMs: 10 });
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately on a non-retryable error', async () => {
    const fn = vi.fn(async () => {
      throw new AuthError('bad');
    });
    await expect(withRetry(fn, { retries: 5 })).rejects.toBeInstanceOf(AuthError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after `retries` attempts and rethrows the last error', async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => {
      throw new NetworkError('always');
    });
    const p = withRetry(fn, { retries: 2, jitter: 'none', baseDelayMs: 5 });
    p.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(p).rejects.toBeInstanceOf(NetworkError);
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('honors RateLimitError.retryAfter over computed backoff', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new RateLimitError('slow', { retryAfter: 5 }))
      .mockResolvedValueOnce('ok');
    const p = withRetry(fn, { respectRetryAfter: true, jitter: 'none', baseDelayMs: 50 });
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(4000);
    expect(fn).toHaveBeenCalledTimes(1); // still waiting out the 5s Retry-After
    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('short-circuits when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn(async () => 'ok');
    await expect(withRetry(fn, { signal: controller.signal })).rejects.toBeDefined();
    expect(fn).not.toHaveBeenCalled();
  });

  it('respects a custom isRetryable predicate', async () => {
    const fn = vi.fn(async () => {
      throw new Error('plain');
    });
    await expect(withRetry(fn, { retries: 3, isRetryable: () => false })).rejects.toThrow('plain');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
